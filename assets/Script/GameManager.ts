import Reel from "./Reel";
import RNGService from "./RNGService";
import PayoutService from "./PayoutService";
import UIController from "./UIController";
import { GameState } from "./Enums";
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

  @property([cc.Node])
  winFireNodes: cc.Node[] = [];

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
  sprite_bigWin: cc.Node = null;

  @property(cc.Label)
  label_num: cc.Label = null;

  private bigWinAudioID: number = -1;

  state: GameState = GameState.IDLE;

  rng = new RNGService();
  payout = new PayoutService();

  credit: number = 1000;
  bet: number = 10;

  spinResult = null;

  onLoad() {
    this.ui.updateCredit(this.credit);
    this.endSpinSequence();
    this.resetWinFireNodes();
    this.hideBigWin(); // 初始時隱藏 BigWin

    if (this.winNumLabel) {
      this.winNumLabel.string = "";
    }
  }

  hideBigWin() {
    if (this.node_BigWinLayer) {
      this.node_BigWinLayer.active = false;
    }
    if (this.sprite_bigWin) cc.Tween.stopAllByTarget(this.sprite_bigWin);

    if (this.coinSpawner) {
      this.coinSpawner.stopContinuousSpawning();
    }
    if (this.bigWinAudioID !== -1) {
      cc.audioEngine.stopEffect(this.bigWinAudioID);
      this.bigWinAudioID = -1;
    }
  }

  resetWinFireNodes() {
    this.winFireNodes.forEach(node => {
      if (node) {
        cc.Tween.stopAllByTarget(node);
        node.opacity = 0; // 贏分特效平時隱藏
      }
    });
  }

  endSpinSequence() {
    this.lightNodes.forEach(node => { if (node) cc.Tween.stopAllByTarget(node); });

    this.lightNodes.forEach(node => { if (node) node.opacity = 100; });
  }

  startSpinSequence() {
    // onSpinClick 狀態

    this.resetWinFireNodes(); // 開始新的一局時重置贏分特效
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

  startWinFireSequence() {
    // 同時點亮所有 winFireNodes
    for (let i = 0; i < this.winFireNodes.length; i++) {
      if (this.winFireNodes[i]) {
        cc.tween(this.winFireNodes[i])
          .to(0.1, { opacity: 255 }) // 0.1秒內變成全亮
          .start();
      }
    }
  }

  showBigWin(coinsWon: number) {
    if (!this.node_BigWinLayer) return;

    // 1. 顯示大框架
    this.node_BigWinLayer.active = true;

    // 2. 字體彈跳出現
    if (this.sprite_bigWin) {
      cc.Tween.stopAllByTarget(this.sprite_bigWin);
      this.sprite_bigWin.scale = 0; // 先縮小到0
      cc.tween(this.sprite_bigWin)
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

    // 播放下注/旋轉按鈕的音效
    if (this.betButtonAudio) {
      cc.audioEngine.playEffect(this.betButtonAudio, false);
    }

    this.credit -= this.bet;
    this.ui.updateCredit(this.credit);

    this.startSpinSequence();
    this.startSpin();
  }

  startSpin() {
    cc.log("🎬 startSpin() called");
    this.state = GameState.SPINNING;

    this.spinResult = this.rng.getSpinResult();
    cc.log("🎲 spinResult:", this.spinResult);

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
      this.startWinFireSequence(); // 觸發贏分特效

      if (this.winNumLabel) {
        this.winNumLabel.string = coinsWon.toLocaleString(); // 顯示贏分數值 (含千分位)
      }

      // 如果贏分倍數 >= 10，視為大獎
      if (totalWinMultipliers >= 10) {
        // 觸發大獎彈窗跑分與音效等動畫
        this.showBigWin(coinsWon);
      } else {
        // 一般小獎，只播放普通的贏分音效（單次）
        if (this.fireAudio) {
          cc.audioEngine.playEffect(this.fireAudio, false);
        }
      }

      cc.log(`🎉 Total Win! You won ${coinsWon} credits (${totalWinMultipliers}x)`);
    }

    this.ui.updateCredit(this.credit);

    this.endSpinSequence(); // 一次spin結束後，將燈號還原到待機狀態
    this.state = GameState.IDLE;
  }
}