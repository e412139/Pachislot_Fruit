import Reel from "./Reel";
import RNGService from "./RNGService";
import PayoutService from "./PayoutService";
import UIController from "./UIController";
import { GameState, SymbolType } from "./Enums";
import CoinSpawner from "./CoinSpawner";

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

  @property(cc.Label)
  winNumLabel: cc.Label = null;

  @property(CoinSpawner)
  coinSpawner: CoinSpawner = null;

  @property(cc.Node)
  node_BigWinLayer: cc.Node = null;

  @property(cc.Node)
  sprite_titleWin: cc.Node = null;

  @property(cc.Label)
  label_num: cc.Label = null;

  @property(cc.SpriteFrame)
  sprite_megaWin: cc.SpriteFrame = null;
  @property(cc.SpriteFrame)
  sprite_superWin: cc.SpriteFrame = null;
  @property(cc.SpriteFrame)
  sprite_bigWin: cc.SpriteFrame = null;

  @property(cc.Node)
  btn_spinNode: cc.Node = null; // 綁定那個圓圓的大 Spin 按鈕，用來掛載原生觸控(長按)事件

  @property(cc.ParticleSystem)
  spinParticle: cc.ParticleSystem = null; // 粒子特效元件，用來控制開始噴發或停止

  @property(cc.Node)
  node_AutoSpinMenu: cc.Node = null; // 自動旋轉的次數選單

  @property(cc.Node)
  label_spintitle: cc.Node = null; // 原本大按鈕上的 "開始" 等預設文字節點

  @property(cc.Label)
  label_spinBtn: cc.Label = null; // 剛剛新建的 label_runLoop

  private isLongPress: boolean = false;
  private autoSpinCount: number = 0; // 剩餘自動旋轉次數，-1 表無限

  private bigWinAudioID: number = -1;

  state: GameState = GameState.IDLE;

  rng = new RNGService();
  payout = new PayoutService();

  credit: number = 1000;
  bet: number = 10;

  spinResult = null;
  private riggedResult: SymbolType[][] = null; // 測試模式用的強制結果

  onLoad() {
    this.ui.updateScore(this.credit);
    this.endSpinSequence();
    this.hideBigWin(); // 初始時隱藏 BigWin
    this.updateSpinButtonUI(); // 初始化按鈕文字

    if (this.winNumLabel) {
      this.winNumLabel.string = "";
    }

    if (this.node_AutoSpinMenu) {
      this.node_AutoSpinMenu.active = false;
    }

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
  }

  hideBigWin() {
    if (this.node_BigWinLayer) {
      this.node_BigWinLayer.active = false;
    }
    if (this.sprite_titleWin) cc.Tween.stopAllByTarget(this.sprite_titleWin);

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
    this.hideBigWin(); // 開始新局時隱藏上一局的 BigWin

    if (this.winNumLabel) {
      this.winNumLabel.string = ""; // 清除贏分字樣
    }

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

  showBigWin(coinsWon: number, multiplier: number) {
    if (!this.node_BigWinLayer) return;

    // 1. 顯示大框架
    this.node_BigWinLayer.active = true;

    // 2. 字體依據倍率替換圖片並彈跳出現
    if (this.sprite_titleWin) {
      let spriteComp = this.sprite_titleWin.getComponent(cc.Sprite);
      if (spriteComp) {
        if (multiplier >= 50) {
          spriteComp.spriteFrame = this.sprite_superWin;
        } else if (multiplier >= 20) {
          spriteComp.spriteFrame = this.sprite_megaWin;
        } else {
          spriteComp.spriteFrame = this.sprite_bigWin;
        }
      }

      cc.Tween.stopAllByTarget(this.sprite_titleWin);
      this.sprite_titleWin.scale = 0; // 先縮小到0
      cc.tween(this.sprite_titleWin)
        .to(0.4, { scale: 1.2 }, { easing: 'backOut' }) // 放大並有點彈性超出
        .to(0.2, { scale: 1.0 }) // 縮回正常大小
        .start();
    }

    // 3. 觸發噴金幣 (若有綁定) 持續噴發
    if (this.coinSpawner) {
      this.coinSpawner.startContinuousSpawning();
    }

    // 4. 重複播放大獎音效
    if (this.bigWinAudio && this.bigWinAudioID === -1) {
      this.bigWinAudioID = cc.audioEngine.playEffect(this.bigWinAudio, true);
    }

    // 5. 數字跑分滾動
    if (this.label_num) {
      this.label_num.string = "0";

      let duration = 2.0;
      let startTime = cc.director.getTotalTime();

      let counterCallback = () => {
        let now = cc.director.getTotalTime();
        let ratio = (now - startTime) / (duration * 1000);

        if (ratio >= 1.0) {
          this.label_num.string = coinsWon.toLocaleString();
          this.unschedule(counterCallback);

          // 滾到指定數字時：停止噴發金幣與停止循環音效
          if (this.coinSpawner) {
            this.coinSpawner.stopContinuousSpawning();
          }
          if (this.bigWinAudioID !== -1) {
            cc.audioEngine.stopEffect(this.bigWinAudioID);
            this.bigWinAudioID = -1;
          }

          // 動畫播放結束後（此時滿 2 秒），稍微停留 0.5 秒讓玩家看清楚最終數字，接著自動移除 BigWin 畫布
          this.scheduleOnce(() => {
            this.hideBigWin();
          }, 0.5);
        } else {
          let currentVal = Math.floor(coinsWon * ratio);
          this.label_num.string = currentVal.toLocaleString();
        }
      };

      this.schedule(counterCallback, 0); // 每幀執行
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

    // 關閉原本可能開著的選單
    if (this.node_AutoSpinMenu) {
      this.node_AutoSpinMenu.active = false;
    }

    // 播放下注/旋轉按鈕的音效
    if (this.betButtonAudio) {
      cc.audioEngine.playEffect(this.betButtonAudio, false);
    }

    this.credit -= this.bet;
    this.ui.updateScore(this.credit);

    this.startSpinSequence();
    this.startSpin();
  }

  startSpin() {
    cc.log("🎬 startSpin() called");
    this.state = GameState.SPINNING;

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
    }, 1);
  }

  stopReels() {
    cc.log("🛑 stopReels() called");
    this.state = GameState.STOPPING;

    let stoppedCount = 0;

    this.reels.forEach((r, i) => {
      cc.log(`📌 Stopping reel ${i} with target:`, this.spinResult[i]);
      r.stop(this.spinResult[i], () => {
        stoppedCount++;
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

    if (totalWinMultipliers > 0) {
      let coinsWon = totalWinMultipliers * this.bet;
      this.credit += coinsWon;
      this.ui.playWin();

      if (this.winNumLabel) {
        this.winNumLabel.string = coinsWon.toLocaleString(); // 顯示贏分數值 (含千分位)
      }

      if (totalWinMultipliers >= 10) {
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

    this.endSpinSequence(); // 一次spin結束後，將燈號還原到待機狀態
    this.state = GameState.IDLE;

    // ======== 自動旋轉 (Auto Spin) 判定邏輯 ========
    if (this.autoSpinCount !== 0) {
      if (this.autoSpinCount > 0) {
        this.autoSpinCount--;
        this.updateSpinButtonUI(); // 扣除局數後更新介面
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
      this.updateSpinButtonUI();
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
    if (this.node_AutoSpinMenu) {
      this.node_AutoSpinMenu.active = true;
    }
  }

  // 供 Auto Spin Menu 裡的各個選項按鈕 (Click Events) 呼叫
  onAutoSpinSelected(event: any, customEventData: string) {
    let count = parseInt(customEventData);
    this.autoSpinCount = count;

    if (this.node_AutoSpinMenu) {
      this.node_AutoSpinMenu.active = false;
    }

    this.updateSpinButtonUI(); // 設定為所選局數後更新介面

    cc.log(`⚙️ Auto Spin Mode Started: ${count === -1 ? 'Infinity' : count}`);
    this.onSpinClick(); // 馬上開始第一把
  }

  // 更新 Spin 按鈕介面上的文字與顯示狀態
  updateSpinButtonUI() {
    if (!this.label_spinBtn) return;

    if (this.autoSpinCount === 0) {
      // 狀態歸零：關閉剩下局數，還原預設文字
      this.label_spinBtn.node.active = false;
      if (this.label_spintitle) {
        this.label_spintitle.active = true;
      }
    } else {
      // 自動旋轉中：開啟局數，隱藏預設文字
      this.label_spinBtn.node.active = true;
      if (this.label_spintitle) {
        this.label_spintitle.active = false;
      }

      if (this.autoSpinCount === -1) {
        this.label_spinBtn.string = "∞"; // 無限符號
      } else if (this.autoSpinCount > 0) {
        this.label_spinBtn.string = this.autoSpinCount.toString();
      }
    }
  }

  // ================= 測試模式專用按鈕綁定區 =================

  forceWinA() { this.triggerTestWin(SymbolType.A); }
  forceWinB() { this.triggerTestWin(SymbolType.B); }
  forceWinC() { this.triggerTestWin(SymbolType.C); }
  forceWinD() { this.triggerTestWin(SymbolType.D); }

  private triggerTestWin(symbol: SymbolType) {
    if (this.state !== GameState.IDLE) return;

    // 構建一個必定在中線連成一線的結果陣列
    // 3輪，每輪傳入 [上, 中, 下]，我們讓中間全部都是我們指定的 symbol
    this.riggedResult = [
      [SymbolType.C, symbol, SymbolType.B], // 第1輪
      [SymbolType.A, symbol, SymbolType.C], // 第2輪
      [SymbolType.D, symbol, SymbolType.A]  // 第3輪
    ];

    this.onSpinClick(); // 直接模擬按下旋轉來啟動
  }
}