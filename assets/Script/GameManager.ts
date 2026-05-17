import Reel from "./Reel";
import RNGService from "./RNGService";
import PayoutService from "./PayoutService";
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

  state: GameState = GameState.IDLE;

  rng = new RNGService();
  payout = new PayoutService();

  credit: number = 1000;
  bet: number = 10;

  private isFreeGame: boolean = false;
  private freeSpinsLeft: number = 0;
  private freeGameTotalWin: number = 0;
  private savedAutoSpinCount: number = 0;

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

    if (!this.isFreeGame) {
      this.credit -= this.bet;
      this.ui.updateScore(this.credit);
    }

    this.startSpinSequence();
    this.startSpin();
  }

  startSpin() {
    cc.log("🎬 startSpin() called");
    this.state = GameState.SPINNING;

    // 普通模式：SPIN COUNTER +1、COUNT +3（Free Game 期間不計入）
    if (!this.isFreeGame) {
      console.log("### GameManager calling counterDisplay.addNormalSpin()");
      try {
        if (this.counterDisplay) this.counterDisplay.addNormalSpin();
        console.log("### GameManager calling counterDisplay.addNormalSpin()1");
      } catch (e) {
        cc.warn('[CounterDisplay] addNormalSpin error:', e);
        console.log("### GameManager calling counterDisplay.addNormalSpin()2");
      }
      this.spinCount += 1;
      console.log("### GameManager this.spinCount=", this.spinCount);
      this._updateCountLabel();
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

    let lines = [
      // 橫向 3 條 (Top, Mid, Bot)
      [this.spinResult[0][0], this.spinResult[1][0], this.spinResult[2][0]],
      [this.spinResult[0][1], this.spinResult[1][1], this.spinResult[2][1]],
      [this.spinResult[0][2], this.spinResult[1][2], this.spinResult[2][2]],
      // 交叉 2 條 (\, /)
      [this.spinResult[0][0], this.spinResult[1][1], this.spinResult[2][2]],
      [this.spinResult[0][2], this.spinResult[1][1], this.spinResult[2][0]]
    ];

    let linePositions = [
      [[0, 0], [1, 0], [2, 0]], // 橫向 Top
      [[0, 1], [1, 1], [2, 1]], // 橫向 Mid
      [[0, 2], [1, 2], [2, 2]], // 橫向 Bot
      [[0, 0], [1, 1], [2, 2]], // 交叉 \
      [[0, 2], [1, 1], [2, 0]]  // 交叉 /
    ];

    let totalWinMultipliers = 0;
    for (let i = 0; i < lines.length; i++) {
      let win = this.payout.evaluate(lines[i]);
      if (win > 0) {
        cc.log(`🎉 Line ${i} won ${win}x! Line:`, lines[i]);
        totalWinMultipliers += win;

        // 觸發中獎的圖標閃爍
        let positions = linePositions[i];
        for (let pos of positions) {
          let col = pos[0];
          let row = pos[1];
          this.reels[col].playWinAnimation(row);
        }
      }
    }

    // ---- Scatter 檢查 ----
    let scatterPositions: { col: number; row: number }[] = [];
    for (let c = 0; c < this.spinResult.length; c++) {
      for (let r = 0; r < this.spinResult[c].length; r++) {
        if (this.spinResult[c][r] === SymbolType.SCATTER) {
          scatterPositions.push({ col: c, row: r });
        }
      }
    }

    // 只要盤面上出現 3 個或更多 Scatter (1,3,5輪分佈或是任意)
    const isScatterTriggered = scatterPositions.length >= 3;

    if (totalWinMultipliers > 0) {
      // 中獎：COUNT 歸零
      this.spinCount = 0;
      this._updateCountLabel();

      let coinsWon = totalWinMultipliers * this.bet;
      this.credit += coinsWon;
      this.ui.playWin();

      this.ui.showWinAmount(coinsWon); // 顯示贏分數值 (含千分位)

      if (this.isFreeGame) {
        this.freeGameTotalWin += coinsWon;
      }

      // 如果是要進入 FG，不要在這邊跳 BigWin 彈窗，留到最後 FG 結算
      if (totalWinMultipliers >= 10 && !isScatterTriggered && !this.isFreeGame) {
        // 觸發大獎彈窗跑分與音效等動畫
        this.showBigWin(coinsWon, totalWinMultipliers);
      } else {
        // 一般小獎，只播放普通的贏分音效（單次）
        if (this.fireAudio) {
          cc.audioEngine.playEffect(this.fireAudio, false);
        }
      }

      cc.log(`🎉 Total Win! You won ${coinsWon} credits (${totalWinMultipliers}x)`);
    }

    this.ui.updateScore(this.credit);

    // 處理 Scatter 動畫
    if (isScatterTriggered) {
      scatterPositions.forEach(pos => {
        this.reels[pos.col].playScatterAnimation(pos.row);
      });
    }

    // ---- 判斷是否進入 Free Game ----
    if (isScatterTriggered && !this.isFreeGame) {
      cc.log("⭐ 3 Scatter detected! Entering Free Game...");
      this.scheduleOnce(() => {
        this.prepareEnterFreeGame();
      }, 1.5);
      return;
    }

    // ---- Free Game 局數管理 ----
    if (this.isFreeGame) {
      this.freeSpinsLeft--;
      this.ui.updateSpinButton(this.freeSpinsLeft);

      let delay = 1.0;
      if (totalWinMultipliers > 0) {
        delay = totalWinMultipliers >= 10 ? 2.5 : 1.5;
      }

      if (this.freeSpinsLeft > 0) {
        this.scheduleOnce(() => {
          this.state = GameState.IDLE;
          this.onSpinClick();
        }, delay);
      } else {
        this.scheduleOnce(() => {
          this.processFreeGameEnd();
        }, delay + 1.0);
      }
      return;
    }

    this.endSpinSequence(); // 一次spin結束後，將燈號還原到待機狀態
    this.state = GameState.IDLE;

    // ======== 自動旋轉 (Auto Spin) 判定邏輯 ========
    if (this.autoSpinCount !== 0) {
      if (this.autoSpinCount > 0) {
        this.autoSpinCount--;
        this.ui.updateSpinButton(this.autoSpinCount); // 扣除局數後更新介面
      }
      cc.log(`🔄 Auto Spin 準備進行下一把，剩餘次數: ${this.autoSpinCount === -1 ? '無限' : this.autoSpinCount}`);

      let nextSpinDelay = 1.0; // 預設沒中獎的下一局等待時間

      if (totalWinMultipliers > 0) {
        if (totalWinMultipliers >= 10) {
          nextSpinDelay = 3.0; // 大獎演出較久 (跑分2秒 + 停留0.5秒 + 關閉)，抓 3 秒接下一局
        } else {
          nextSpinDelay = 1.6; // 小獎稍微多停一會讓玩家看字
        }
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

  forceWinA() { this.triggerTestWin(SymbolType.A); }
  forceWinB() { this.triggerTestWin(SymbolType.B); }
  forceWinC() { this.triggerTestWin(SymbolType.C); }
  forceWinD() { this.triggerTestWin(SymbolType.D); }

  private triggerTestWin(symbol: SymbolType) {
    // 檢查1：目前正處於自動轉輪循環中 (無論是無限轉還是有剩餘次數)
    if (this.autoSpinCount !== 0) {
      this.ui.showIOSAlert("請先點擊主畫面的 Spin 按鈕終止「自動旋轉」後，再進行大獎測試！");
      return;
    }

    // 檢查2：目前是單次旋轉，但轉輪或是中獎動畫還在進行中
    if (this.state !== GameState.IDLE) {
      this.ui.showIOSAlert("轉輪或動畫正在進行中！\n請等這局完全結束後，再進行大獎測試！");
      return;
    }

    // 構建一個必定在中線連成一線的結果陣列
    // 3輪，每輪傳入 [上, 中, 下]，我們讓中間全部都是我們指定的 symbol
    this.riggedResult = [
      [SymbolType.C, symbol, SymbolType.B], // 第1輪
      [SymbolType.A, symbol, SymbolType.C], // 第2輪
      [SymbolType.D, symbol, SymbolType.A]  // 第3輪
    ];

    this.onSpinClick(); // 直接模擬按下旋轉來啟動
  }

  // ==== Free Game 流程控制 (參照 Slot 機制) ====

  private prepareEnterFreeGame() {
    // 台數表：BB 觸發，重置 SPIN COUNTER，BB回数 +1
    try {
      if (this.counterDisplay) this.counterDisplay.onBonusTriggered();
    } catch (e) {
      cc.warn('[CounterDisplay] onBonusTriggered error:', e);
    }
    // COUNT 歸零
    this.spinCount = 0;
    this._updateCountLabel();

    // 進入 FG 轉場：隱藏台數表
    if (this.counterDisplay) this.counterDisplay.node.active = false;

    this.ui.clearWinAmount();
    // 1. 播放 FG Trigger 音效
    if (this.audioService) this.audioService.playFGTrigger();

    // 2. 顯示過渡頁面
    this.ui.showFGCongrats(1.5, () => {
      this.enterFreeGame();
    });

    // 3. 在過渡期間悄悄換背景與 BGM
    this.scheduleOnce(() => {
      this.ui.swapBackground(true);
      if (this.audioService) this.audioService.playFreeGameBGM();
    }, 0.3);
  }

  private enterFreeGame() {
    this.isFreeGame = true;
    this.freeSpinsLeft = 8;
    this.freeGameTotalWin = 0;

    this.savedAutoSpinCount = this.autoSpinCount;
    this.autoSpinCount = 0;

    this.ui.updateSpinButton(this.freeSpinsLeft);

    // 啟動霓虹蛇特效
    this.ui.setNeonEffect(true);

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
    this.ui.swapBackground(false);
    if (this.audioService) this.audioService.playNormalBGM();

    // 關閉霓虹蛇特效
    this.ui.setNeonEffect(false);

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

    const S = SymbolType.SCATTER;
    const A = SymbolType.A;
    // 構建一個中線全是 Scatter 的盤面 (Reel 0,1,2 中間都是 S)
    this.riggedResult = [
      [A, S, A], // 第1輪 (Top, Mid, Bot)
      [A, S, A], // 第2輪
      [A, S, A]  // 第3輪
    ];

    cc.log("🚀 [Test] 強制觸發 3 Scatter 中獎流程");
    this.onSpinClick();
  }
}