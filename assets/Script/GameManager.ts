import Reel from "./Reel";
import RNGService from "./RNGService";
import PayoutService, { PayResult } from "./PayoutService";
import UIController from "./UIController";
import { GameState, SymbolType } from "./Enums";
import CoinSpawner from "./CoinSpawner";
import AudioService from "./AudioService";
import CounterDisplay from "./CounterDisplay";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameManager extends cc.Component {

  @property([Reel])
  reels: Reel[] = [];

  @property(UIController)
  ui: UIController = null;

  @property([cc.Node])
  lightNodes: cc.Node[] = [];

  @property(cc.AudioClip)
  betButtonAudio: cc.AudioClip = null;

  @property(cc.AudioClip)
  fireAudio: cc.AudioClip = null;

  @property(cc.AudioClip)
  bigWinAudio: cc.AudioClip = null;

  @property(AudioService)
  audioService: AudioService = null;

  @property(CoinSpawner)
  coinSpawner: CoinSpawner = null;

  @property(CounterDisplay)
  counterDisplay: CounterDisplay = null;

  @property(cc.Label)
  label_count: cc.Label = null;  // 下方 COUNT 計數器

  @property(cc.Node)
  btn_spinNode: cc.Node = null; // 綁定那個圓圓的大 Spin 按鈕，用來掛載原生觸控(長按)事件

  @property(cc.AudioClip)
  reelStopAudio: cc.AudioClip = null; // 停輪音效

  @property(cc.ParticleSystem)
  spinParticle: cc.ParticleSystem = null; // 粒子特效元件，用來控制開始噴發或停止


  private isLongPress: boolean = false;
  private autoSpinCount: number = 0; // 剩餘自動旋轉次數，-1 表無限

  private bigWinAudioID: number = -1;
  private spinCount: number = 0;  // COUNT 計數器（每轉 +3）

  // 天井系統：連續未中 BB/RB 的轉數，達上限自動觸發 BB
  private readonly TENJOU_SPINS: number = 800;
  private tenjouCount: number = 0;

  // 連莊系統：離開 FG 後 100 轉內再觸發 BB/RB 為連莊
  private readonly RENZAN_WINDOW: number = 100;
  private renzanStreak: number = 0;     // 當前連莊次數（1=第一次無連莊, 2=連莊1次...）
  private spinsAfterFG: number = 0;     // 離開 FG 後的普通轉數
  private isInRenzanWindow: boolean = false; // 是否在連莊窗口內

  // 連莊測試專用
  private renzanTestRemaining: number = 0;    // 還需自動觸發的 RB 次數
  private pendingRenzanAfterSpin: boolean = false; // 這轉結束後自動觸發下一次 RB

  state: GameState = GameState.IDLE;

  rng = new RNGService();
  payout = new PayoutService();

  credit: number = 1000;
  bet: number = 30;

  private isFreeGame: boolean = false;
  private freeSpinsLeft: number = 0;
  private freeGameTotalWin: number = 0;
  private fgNetTokens: number = 0;    // FG 內累積純增枚數（紅色 COUNT 用）
  private fgGrossTokens: number = 0;  // FG 內累積吐幣（Gross Pay），RB 上限 120 枚
  private savedAutoSpinCount: number = 0;
  private fgMode: 'BB' | 'RB' = 'BB';  // BB=777(23轉) RB=77BAR(8轉)
  private isReplayPending: boolean = false;  // REPLAY 免費下一轉

  spinResult = null;
  private riggedResult: SymbolType[][] = null; // 測試模式用的強制結果

  onLoad() {
    cc.log('[GM] onLoad()');
    this.ui.updateScore(this.credit);
    this.endSpinSequence();
    this.ui.hideBigWinLayer(); // 初始時隱藏 BigWin
    this.ui.updateSpinButton(this.autoSpinCount); // 初始化按鈕文字
    this.ui.clearWinAmount(); // 清空贏分顯示

    // 掛載長按觸發機制
    if (this.btn_spinNode) {
      this.btn_spinNode.on(cc.Node.EventType.TOUCH_START, this.onSpinTouchStart, this);
      this.btn_spinNode.on(cc.Node.EventType.TOUCH_END, this.onSpinTouchEnd, this);
      this.btn_spinNode.on(cc.Node.EventType.TOUCH_CANCEL, this.onSpinTouchCancel, this);
    }

    // 初始化確認關閉粒子
    if (this.spinParticle) {
      this.spinParticle.stopSystem();
    }

    if (this.audioService) {
      this.audioService.playNormalBGM();
    }
  }

  onDestroy() {
    if (this.btn_spinNode) {
      this.btn_spinNode.off(cc.Node.EventType.TOUCH_START, this.onSpinTouchStart, this);
      this.btn_spinNode.off(cc.Node.EventType.TOUCH_END, this.onSpinTouchEnd, this);
      this.btn_spinNode.off(cc.Node.EventType.TOUCH_CANCEL, this.onSpinTouchCancel, this);
    }

    // 離開場景時強力釋放資源
    if (this.audioService) {
      this.audioService.stopAll();
    }
    this.unscheduleAllCallbacks();
  }

  private _updateCountLabel() {
    if (this.label_count) {
      this.label_count.string = this.spinCount.toString();
    }
  }

  /** 停止大獎特效（金幣噴發 + 音效），GameManager 專屬的遊戲效果層 */
  private stopBigWinEffects() {
    if (this.coinSpawner) {
      this.coinSpawner.stopContinuousSpawning();
    }
    if (this.bigWinAudioID !== -1) {
      cc.audioEngine.stopEffect(this.bigWinAudioID);
      this.bigWinAudioID = -1;
    }
  }

  endSpinSequence() {
    this.lightNodes.forEach(node => { if (node) cc.Tween.stopAllByTarget(node); });

    this.lightNodes.forEach(node => { if (node) node.opacity = 100; });
  }

  startSpinSequence() {
    // onSpinClick 狀態
    this.stopBigWinEffects(); // 開始新局時停止上一局的金幣/音效
    this.ui.hideBigWinLayer(); // 開始新局時隱藏上一局的 BigWin
    this.ui.clearWinAmount(); // 清除贏分字樣

    this.lightNodes.forEach(node => {
      if (node) {
        cc.Tween.stopAllByTarget(node);
        node.opacity = 100;
      }
    });

    let delayTime = 0;
    const interval = 0.2; // 稍微調快間隔時間以配合旋轉速度

    // 依序點亮 (Light up) lightNodes
    for (let i = 0; i < this.lightNodes.length; i++) {
      if (this.lightNodes[i]) {
        delayTime += interval;
        cc.tween(this.lightNodes[i])
          .delay(delayTime)
          .to(0.1, { opacity: 255 }) // 0.1秒內變成全亮
          .start();
      }
    }
  }

  /** 大獎演出協調者：委派 UI 播動畫，自己管金幣與音效 */
  showBigWin(coinsWon: number, multiplier: number) {
    // 1. 委派 UI 播放視覺動畫（圖片切換 + Tween + 跑分），跑分結束時 callback 停止特效
    this.ui.showBigWinAnimation(coinsWon, multiplier, () => {
      this.stopBigWinEffects();
    });

    // 2. 觸發噴金幣
    if (this.coinSpawner) {
      this.coinSpawner.startContinuousSpawning();
    }

    // 3. 重複播放大獎音效
    if (this.bigWinAudio && this.bigWinAudioID === -1) {
      this.bigWinAudioID = cc.audioEngine.playEffect(this.bigWinAudio, true);
    }
  }
  onSpinClick() {
    cc.log("🎰 onSpinClick() called, current state:", this.state);
    if (this.state !== GameState.IDLE) {
      cc.log("❌ Not in IDLE state, ignoring spin");
      return;
    }

    // 若還有自動旋轉次數，但在普通點擊時，表示手動干預，中止自動旋轉
    if (this.autoSpinCount > 0 || this.autoSpinCount === -1) {
      if (!this.isLongPress && this.autoSpinCount > 0) {
        cc.log("手動點擊，中止自動旋轉狀態");
      }
    }

    if (this.isFreeGame && this.state !== GameState.IDLE) return;

    // 關閉原本可能開著的選單
    this.ui.hideAutoSpinMenu();

    // 播放下注/旋轉按鈕的音效
    if (this.betButtonAudio) {
      cc.audioEngine.playEffect(this.betButtonAudio, false);
    }

    if (this.isFreeGame) {
      // FG 模式每轉花費 1 枚（= bet / 3），而非免費
      this.credit -= Math.floor(this.bet / 3);
      this.ui.updateScore(this.credit);
    } else if (!this.isReplayPending) {
      // 一般模式每轉花費 3 枚（= bet）
      this.credit -= this.bet;
      this.ui.updateScore(this.credit);
    }
    this.isReplayPending = false;

    this.startSpinSequence();
    this.startSpin();
  }

  startSpin() {
    cc.log("🎬 startSpin() called");
    this.state = GameState.SPINNING;

    // 普通模式：SPIN COUNTER +1（Free Game 期間不計入）
    if (!this.isFreeGame) {
      try {
        if (this.counterDisplay) this.counterDisplay.addNormalSpin();
      } catch (e) {
        cc.warn('[CounterDisplay] addNormalSpin error:', e);
      }
      this.spinCount += 1;
      this.tenjouCount += 1;
      cc.log(`[天井] tenjouCount=${this.tenjouCount}/${this.TENJOU_SPINS}`);

      // 連莊窗口倒數
      if (this.isInRenzanWindow) {
        this.spinsAfterFG++;
        if (this.spinsAfterFG > this.RENZAN_WINDOW) {
          // 超過 100 轉，連莊機會消失（邏輯歸零）
          // 箭頭不隱藏：保留歷史紀錄，待後續 _shiftBars 推出圖表右緣才自然消失
          this.isInRenzanWindow = false;
          this.renzanStreak = 0;
          cc.log('💔 連莊窗口關閉（超過 100 轉），箭頭保留為歷史紀錄');
        }
      }
      this._updateCountLabel();

      // 天井達標：強制下一轉 777 → BB
      if (this.tenjouCount >= this.TENJOU_SPINS && !this.riggedResult) {
        const S = SymbolType.SEVEN;
        const X = SymbolType.WATERMELON;
        this.riggedResult = [
          [X, S, X],
          [X, S, X],
          [X, S, X]
        ];
        cc.log(`🌙 天井！${this.TENJOU_SPINS} 轉未中 BB/RB，本轉強制觸發 777 → BB`);
      }
    }

    // FG 模式：每轉 100% 中獎 → 強制中線 BELL×3 = 15 枚
    if (this.isFreeGame && !this.riggedResult) {
      // 墊位用不同 symbol 錯開，避免上/下排或對角線形成意外連線
      // reel[i] = [top, mid, bot]
      const B = SymbolType.BELL;
      const C = SymbolType.COCONUT;
      const W = SymbolType.WATERMELON;
      this.riggedResult = [
        [C, B, W], // reel 0: top=COCONUT,     mid=BELL, bot=WATERMELON
        [W, B, C], // reel 1: top=WATERMELON,  mid=BELL, bot=COCONUT
        [C, B, W], // reel 2: top=COCONUT,     mid=BELL, bot=WATERMELON
      ];
    }

    // FG 模式：滾輪開始轉動時，COUNT 切換為黑色顯示剩餘轉數
    if (this.isFreeGame) {
      this.ui.setFGCount(this.freeSpinsLeft, false);
    }

    if (this.riggedResult) {
      this.spinResult = this.riggedResult;
      this.riggedResult = null; // 用完就清空
      cc.log("🎲 [TEST MODE] Rigged spinResult:", this.spinResult);
    } else {
      this.spinResult = this.rng.getSpinResult();
      cc.log("🎲 spinResult:", this.spinResult);
    }

    this.reels.forEach(r => r.spin());

    this.scheduleOnce(() => {
      this.stopReels();
    }, 1.0);
  }

  stopReels() {
    cc.log("🛑 stopReels() called");
    this.state = GameState.STOPPING;

    let stoppedCount = 0;
    let hasPlayedSound = false; // 控制同時停止時只發出一次聲音

    this.reels.forEach((r, i) => {
      cc.log(`📌 Stopping reel ${i} with target:`, this.spinResult[i]);
      r.stop(this.spinResult[i], () => {
        stoppedCount++;

        // ---- 播放音效邏輯 ----
        // 由於三根轉輪幾乎同時發出停止命令、也會同時停下，為了不疊音只播放一次
        if (this.reelStopAudio && !hasPlayedSound) {
          cc.audioEngine.playEffect(this.reelStopAudio, false);
          hasPlayedSound = true;
        }

        if (stoppedCount === this.reels.length) {
          cc.log("💯 All reels have fully stopped! Triggering onResult instantly.");
          this.onResult();
        }
      });
    });
  }

  onResult() {
    this.state = GameState.RESULT;

    const lines = [
      [this.spinResult[0][0], this.spinResult[1][0], this.spinResult[2][0]],
      [this.spinResult[0][1], this.spinResult[1][1], this.spinResult[2][1]],
      [this.spinResult[0][2], this.spinResult[1][2], this.spinResult[2][2]],
      [this.spinResult[0][0], this.spinResult[1][1], this.spinResult[2][2]],
      [this.spinResult[0][2], this.spinResult[1][1], this.spinResult[2][0]]
    ];
    const linePositions = [
      [[0, 0], [1, 0], [2, 0]],
      [[0, 1], [1, 1], [2, 1]],
      [[0, 2], [1, 2], [2, 2]],
      [[0, 0], [1, 1], [2, 2]],
      [[0, 2], [1, 1], [2, 0]]
    ];

    let totalCoins = 0;
    let triggerBB = false;
    let triggerRB = false;
    let isReplay = false;

    // ── 連線判斷（兩階段）──────────────────────────────────
    // Phase 1：計算所有線的結果，累積分數與旗標
    const lineResults: { res: PayResult; positions: number[][] }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const res: PayResult = this.payout.evaluate(lines[i], this.isFreeGame);
      lineResults.push({ res, positions: linePositions[i] });
      totalCoins += res.coins;
      if (res.triggerBB) triggerBB = true;
      if (res.triggerRB) triggerRB = true;
      if (res.isReplay)  isReplay  = true;
    }

    // Phase 2：依優先級決定動畫
    // 優先級（互斥）：BB/RB trigger > 有枚數 > REPLAY（再一次）
    // FG 模式下 REPLAY 是墊位，不屬於任何優先級
    const hasBBRBWin = triggerBB || triggerRB;
    const hasCoinWin = totalCoins > 0;

    for (const { res, positions } of lineResults) {
      let shouldAnimate = false;

      if (hasBBRBWin) {
        // 最高優先：只閃 BB/RB 觸發線
        shouldAnimate = res.triggerBB || res.triggerRB;
      } else if (hasCoinWin) {
        // 次優先：只閃有枚數的線
        shouldAnimate = res.coins > 0;
      } else {
        // 最低優先：只閃 REPLAY（普通模式才閃，FG 是墊位不閃）
        shouldAnimate = res.isReplay && !this.isFreeGame;
      }

      if (shouldAnimate) {
        for (const pos of positions) {
          this.reels[pos[0]].playWinAnimation(pos[1]);
        }
      }
    }

    // ── 櫻桃：最左輪出現即中，2枚，不需連線 ──────────────
    const cherryOnLeft = this.spinResult[0].some(s => s === SymbolType.CHERRY);
    if (cherryOnLeft) {
      totalCoins += 2;
      this.spinResult[0].forEach((s, r) => {
        if (s === SymbolType.CHERRY) this.reels[0].playWinAnimation(r);
      });
    }

    // ── 計算金額（枚數 × bet / 3）─────────────────────────
    const coinsWon = totalCoins > 0 ? Math.floor(totalCoins * this.bet / 3) : 0;
    const effectiveMulti = totalCoins / 3;
    const isBBRBTrigger = (triggerBB || triggerRB) && !this.isFreeGame;

    if (coinsWon > 0) {
      this.spinCount = 0;
      this._updateCountLabel();
      this.credit += coinsWon;
      this.ui.playWin();
      // 延遲 0.5 秒後再顯示贏分，讓玩家先看清楚中獎 symbol
      this.scheduleOnce(() => { this.ui.showWinAmount(coinsWon); }, 0.5);
      if (this.isFreeGame) this.freeGameTotalWin += coinsWon;

      // BigWin 演出：FG 模式每轉固定中獎不算大獎，留到 FG 結算時一次播放
      // 門檻：10枚=BigWin, 20枚=MegaWin, 30枚=SuperWin
      if (totalCoins >= 10 && !isBBRBTrigger && !this.isFreeGame) {
        this.showBigWin(coinsWon, totalCoins);
      } else if (this.fireAudio) {
        cc.audioEngine.playEffect(this.fireAudio, false);
      }
      cc.log(`🎉 coinsWon=${coinsWon} (${totalCoins}枚)`);
    }

    this.ui.updateScore(this.credit);

    // ── 777 → BB 模式 ────────────────────────────────────
    if (triggerBB && !this.isFreeGame) {
      cc.log("7️⃣7️⃣7️⃣ 777! 進入 BB 模式");
      this.scheduleOnce(() => this.prepareEnterFreeGame('BB'), coinsWon > 0 ? 1.5 : 0.5);
      return;
    }

    // ── 77BAR → RB 模式 ─────────────────────────────────
    if (triggerRB && !this.isFreeGame) {
      cc.log("7️⃣7️⃣BAR 77BAR! 進入 RB 模式");
      this.scheduleOnce(() => this.prepareEnterFreeGame('RB'), coinsWon > 0 ? 1.5 : 0.5);
      return;
    }

    // ── REPLAY → 下局免費（有枚數時不執行，枚數優先）──────
    if (isReplay && !this.isFreeGame && totalCoins === 0) {
      cc.log("🔄 REPLAY! 下局免費");
      this.isReplayPending = true;
      this.state = GameState.IDLE;
      this.scheduleOnce(() => { if (this.state === GameState.IDLE) this.onSpinClick(); }, 1.2);
      return;
    }

    // ── Free Game 局數管理 ────────────────────────────────
    if (this.isFreeGame) {
      this.freeSpinsLeft--;
      this.ui.updateSpinButton(this.freeSpinsLeft);

      // 中獎後：累積 gross/net 並更新 COUNT 紅色顯示
      if (coinsWon > 0) {
        this.fgGrossTokens += totalCoins;              // gross 吐幣（含花費前）
        this.fgNetTokens += totalCoins - 1;            // net 純增（扣 1 枚成本）
        this.ui.setFGCount(this.fgNetTokens, true);

        // 吐幣上限檢查（滿足任一條件即強制結算）
        // RB：FG 期間 >= 120 枚（= 135 - trigger 15）
        // BB：FG 期間 >= 345 枚（= 360 - trigger 15）
        const FG_CAP = this.fgMode === 'RB' ? 120 : 345;
        if (this.fgGrossTokens >= FG_CAP) {
          cc.log(`🎰 ${this.fgMode} 吐幣上限達成（${this.fgGrossTokens} 枚 >= ${FG_CAP}），提前結算`);
          this.freeSpinsLeft = 0;
        }
      }

      // FG 每轉固定 1.2 秒後進下一轉（讓中獎音效與贏分顯示可被看到）
      // 最後一轉再多等 1.0 秒才進結算
      const delay = 1.2;
      if (this.freeSpinsLeft > 0) {
        this.scheduleOnce(() => { this.state = GameState.IDLE; this.onSpinClick(); }, delay);
      } else {
        this.scheduleOnce(() => this.processFreeGameEnd(), delay + 1.0);
      }
      return;
    }

    this.endSpinSequence();
    this.state = GameState.IDLE;

    // 連莊測試：中性一轉結束後自動觸發下一次 RB
    if (this.pendingRenzanAfterSpin) {
      this.pendingRenzanAfterSpin = false;
      this.scheduleOnce(() => this._executeRenzanTestRB(), 0.5);
      return;
    }

    // ======== 自動旋轉 (Auto Spin) 判定邏輯 ========
    if (this.autoSpinCount !== 0) {
      if (this.autoSpinCount > 0) {
        this.autoSpinCount--;
        this.ui.updateSpinButton(this.autoSpinCount); // 扣除局數後更新介面
      }
      cc.log(`🔄 Auto Spin 準備進行下一把，剩餘次數: ${this.autoSpinCount === -1 ? '無限' : this.autoSpinCount}`);

      let nextSpinDelay = 1.0;

      if (coinsWon > 0) {
        nextSpinDelay = totalCoins >= 10 ? 3.0 : 1.6;
      }

      // 依據是否中獎停滯不同秒數後再接下一把
      this.scheduleOnce(() => {
        if (this.state === GameState.IDLE && this.autoSpinCount !== 0) {
          this.onSpinClick();
        }
      }, nextSpinDelay);
    }
  }

  // ================= 觸控長按事件與特效邏輯 =================

  onSpinTouchStart() {
    if (this.state !== GameState.IDLE) return;
    this.isLongPress = false;

    // 按下持續 0.5 秒則觸發自動旋轉選單（並在裡面播放特效）
    this.scheduleOnce(this.triggerLongPressMenu, 0.5);
  }

  onSpinTouchEnd() {
    this.unschedule(this.triggerLongPressMenu);

    if (this.spinParticle) {
      this.spinParticle.stopSystem(); // 結束長按集氣，停止特效
    }

    if (this.state !== GameState.IDLE) return;

    if (!this.isLongPress) {
      // 判斷只是短按：取消任何進行中的 autoSpin，並且發起一次正常旋轉
      this.autoSpinCount = 0;
      this.ui.updateSpinButton(0);
      this.onSpinClick();
    }
  }

  onSpinTouchCancel() {
    this.unschedule(this.triggerLongPressMenu);
    if (this.spinParticle) {
      this.spinParticle.stopSystem();
    }
  }

  triggerLongPressMenu() {
    this.isLongPress = true;
    cc.log("👉 Trigger Long Press (Auto Spin Menu)");

    // 長按達標，開始噴發粒子特效
    if (this.spinParticle) {
      this.spinParticle.resetSystem();
    }

    // 展開自動旋轉選單
    this.ui.showAutoSpinMenu();
  }

  // 供 Auto Spin Menu 裡的各個選項按鈕 (Click Events) 呼叫
  onAutoSpinSelected(event: any, customEventData: string) {
    let count = parseInt(customEventData);
    this.autoSpinCount = count;

    this.ui.hideAutoSpinMenu();
    this.ui.updateSpinButton(count); // 設定為所選局數後更新介面

    cc.log(`⚙️ Auto Spin Mode Started: ${count === -1 ? 'Infinity' : count}`);
    this.onSpinClick(); // 馬上開始第一把
  }



  // ================= 測試模式專用按鈕綁定區 =================
  // 場景按鈕綁定：BB→forceWinA, RB→forceWinB, 🔔→forceWinC, 🥥→forceWinD, 🍉→forceFreeGame

  /** 測試 BB 模式：777 中線三連，觸發 BB（23轉）+ 15枚中獎 */
  forceWinA() {
    if (!this._checkTestReady()) return;
    const S = SymbolType.SEVEN;
    const X = SymbolType.WATERMELON;
    this.riggedResult = [
      [X, S, X],
      [X, S, X],
      [X, S, X]
    ];
    this.onSpinClick();
  }

  /** 測試 RB 模式：77BAR 中線，觸發 RB（8轉）+ 15枚中獎 */
  forceWinB() {
    if (!this._checkTestReady()) return;
    const X = SymbolType.WATERMELON;
    this.riggedResult = [
      [X, SymbolType.SEVEN, X],
      [X, SymbolType.SEVEN, X],
      [X, SymbolType.BAR, X]
    ];
    this.onSpinClick();
  }

  /** 測試 🔔 銅鐘三連：15枚 × (bet/3) */
  forceWinC() { this._triggerLineWin(SymbolType.BELL); }

  /** 測試 🥥 椰子三連：10枚 × (bet/3) */
  forceWinD() { this._triggerLineWin(SymbolType.COCONUT); }

  /**
   * 測試 RB 連莊：
   * 1. 立即進入 RB
   * 2. RB 結束後自動做一轉中性轉（不中獎）
   * 3. 再進入 RB（連莊 1 次）
   * 4. 再做一轉中性轉
   * 5. 再進入 RB（連莊 2 次）
   */
  forceRenzanRB() {
    if (!this._checkTestReady()) return;
    this.renzanTestRemaining = 2; // FG 結束後還要再觸發 2 次 RB
    this._executeRenzanTestRB();
  }

  /** 直接進入 RB（連莊測試內部用） */
  private _executeRenzanTestRB() {
    this.renzanTestRemaining--;
    cc.log(`[連莊測試] 觸發 RB，剩餘待觸發次數: ${this.renzanTestRemaining}`);
    this.prepareEnterFreeGame('RB');
  }

  private _checkTestReady(): boolean {
    if (this.autoSpinCount !== 0) {
      this.ui.showIOSAlert("請先停止「自動旋轉」後再進行測試！");
      return false;
    }
    if (this.state !== GameState.IDLE) {
      this.ui.showIOSAlert("請等當前旋轉結束後再進行測試！");
      return false;
    }
    return true;
  }

  private _triggerLineWin(symbol: SymbolType) {
    if (!this._checkTestReady()) return;
    const X = SymbolType.REPLAY;
    this.riggedResult = [
      [X, symbol, X],
      [X, symbol, X],
      [X, symbol, X]
    ];
    this.onSpinClick();
  }

  // ==== Free Game 流程控制 (參照 Slot 機制) ====

  private prepareEnterFreeGame(mode: 'BB' | 'RB' = 'BB') {
    this.fgMode = mode;

    // 連莊判定：在 100 轉窗口內再觸發 → 連莊
    if (this.isInRenzanWindow) {
      this.renzanStreak++;
      cc.log(`🔥 連莊！第 ${this.renzanStreak} 次連續 Bonus`);
    } else {
      this.renzanStreak = 1; // 新的一串開始
    }
    this.isInRenzanWindow = false;
    this.spinsAfterFG = 0;

    // 台數表：記錄 BB 或 RB（內部呼叫 _shiftBars，箭頭跟著位移）
    // ⚠️ 必須在 showRenzan 之前呼叫，讓 shift 先完成
    try {
      if (this.counterDisplay) {
        mode === 'BB'
          ? (this.counterDisplay as any).onBBTriggered()
          : (this.counterDisplay as any).onRBTriggered();
      }
    } catch (e) {
      cc.warn('[CounterDisplay] trigger error:', e);
    }

    // shift 完成後更新箭頭：
    // - 連莊 >= 2：更新箭頭（延伸或新建）
    // - 連莊 < 2（新一串或窗口外觸發）：不隱藏，箭頭保留歷史位置，
    //   由 CounterDisplay._shiftBars 自然推出圖表右緣後才消失
    if (this.counterDisplay && this.renzanStreak >= 2) {
      (this.counterDisplay as any).showRenzan(this.renzanStreak);
    }

    this.spinCount = 0;
    this.tenjouCount = 0; // 進入 BB/RB，天井計數歸零
    this._updateCountLabel();

    // 進入 FG 轉場：隱藏台數表
    if (this.counterDisplay) this.counterDisplay.node.active = false;

    this.ui.clearWinAmount();
    // 1. 播放 FG Trigger 音效
    if (this.audioService) this.audioService.playFGTrigger();

    // 2. 顯示過渡頁面（BB=23轉, RB=8轉）
    const spinCount = this.fgMode === 'BB' ? 23 : 8;
    this.ui.showFGCongrats(1.5, () => {
      this.enterFreeGame();
    }, spinCount, this.fgMode);

    // 3. 在過渡期間悄悄換背景與 BGM
    this.scheduleOnce(() => {
      this.ui.swapBackground(true);
      if (this.audioService) this.audioService.playFreeGameBGM();
    }, 0.3);
  }

  private enterFreeGame() {
    this.isFreeGame = true;
    // 轉場結束，顯示台數表
    if (this.counterDisplay) this.counterDisplay.node.active = true;
    // BB = 23 轉，RB = 8 轉
    this.freeSpinsLeft = this.fgMode === 'BB' ? 23 : 8;
    this.freeGameTotalWin = 0;
    this.fgNetTokens = 0;   // 重置 FG 純增枚數累計
    this.fgGrossTokens = 0; // 重置 FG 吐幣累計

    this.savedAutoSpinCount = this.autoSpinCount;
    this.autoSpinCount = 0;

    this.ui.updateSpinButton(this.freeSpinsLeft);

    // 啟動霓虹蛇特效
    this.ui.setNeonEffect(true);
    // 顯示 FG 局數計數框
    this.ui.setFGCountVisible(true);

    cc.log("✅ FG Started! Moving to IDLE for auto spin.");
    this.state = GameState.IDLE;
    this.onSpinClick();
  }

  private processFreeGameEnd() {
    cc.log(`🏆 FG End! Total Win: ${this.freeGameTotalWin}`);

    // 不論贏多少或有沒有大獎，旋轉既然結束了，就先把霓虹燈關掉
    this.ui.setNeonEffect(false);

    if (this.freeGameTotalWin > 0) {
      const multi = this.freeGameTotalWin / this.bet;

      // 判斷是否達到大獎演出門檻
      if (multi >= 10) {
        this.showBigWin(this.freeGameTotalWin, multi);

        this.scheduleOnce(() => {
          this.exitFreeGame();
        }, 4.0);
      } else {
        cc.log("⚖️ 未達大獎門檻，直接結束 Free Game");
        this.exitFreeGame();
      }
    } else {
      this.exitFreeGame();
    }
  }

  private exitFreeGame() {
    cc.log("🔙 Exiting Free Game to Normal...");
    // 退出 FG：顯示台數表
    if (this.counterDisplay) this.counterDisplay.node.active = true;

    // 啟動連莊 100 轉窗口
    this.isInRenzanWindow = true;
    this.spinsAfterFG = 0;
    cc.log(`⏱️ 連莊窗口開啟，100 轉內再觸發 BB/RB 即連莊`);

    // 連莊測試：FG 結束後還有待觸發的 RB → 做一轉中性轉再接 RB
    if (this.renzanTestRemaining > 0) {
      this.scheduleOnce(() => {
        if (this.state === GameState.IDLE) {
          // 中性結果：無任何連線，不中獎
          const W = SymbolType.WATERMELON;
          const R = SymbolType.REPLAY;
          const C = SymbolType.COCONUT;
          this.riggedResult = [
            [W, R, C], // reel0: top=W  mid=R  bot=C
            [R, W, C], // reel1: top=R  mid=W  bot=C
            [C, W, R], // reel2: top=C  mid=W  bot=R
          ];
          this.pendingRenzanAfterSpin = true;
          this.onSpinClick();
        }
      }, 1.0);
    }

    this.ui.swapBackground(false);
    if (this.audioService) this.audioService.playNormalBGM();

    // 關閉霓虹蛇特效與 FG 計數框
    this.ui.setNeonEffect(false);
    this.ui.setFGCountVisible(false);

    this.isFreeGame = false;
    this.autoSpinCount = this.savedAutoSpinCount;
    this.ui.updateSpinButton(this.autoSpinCount);

    this.state = GameState.IDLE;
    if (this.autoSpinCount !== 0) {
      this.onResult(); // 這裡用 onResult 觸發 auto spin 延遲檢查比較方便
    }
  }

  // ================= 測試模式：Free Game =================

  /** 
   * [測試專用] 強制觸發 Free Game 
   * 請將您的 freeGame 按鈕綁定到這個函式！ (Click Event -> forceFreeGame)
   */
  forceFreeGame() {
    // 檢查1：轉輪或是中獎動畫還在進行中
    if (this.state !== GameState.IDLE) {
      this.ui.showIOSAlert("轉輪或動畫正在進行中！\n請等這局完全結束後，再進行大獎測試！");
      return;
    }

    // 檢查2：如果是自動旋轉中
    if (this.autoSpinCount !== 0) {
      this.ui.showIOSAlert("請先終止「自動旋轉」後，再進行測試！");
      return;
    }

    // 🍉 西瓜三連：7枚 × (bet/3)
    this._triggerLineWin(SymbolType.WATERMELON);
  }
}