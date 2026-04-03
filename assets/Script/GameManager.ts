import Reel from "./Reel";
import RNGService from "./RNGService";
import PayoutService from "./PayoutService";
import UIController from "./UIController";
import { GameState } from "./Enums";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameManager extends cc.Component {

  @property([Reel])
  reels: Reel[] = [];

  @property(UIController)
  ui: UIController = null;

  @property([cc.Node])
  lightNodes: cc.Node[] = [];

  @property(cc.Node)
  stateWaitNode: cc.Node = null;

  @property(cc.Node)
  stateStartNode: cc.Node = null;

  @property(cc.Node)
  stateReplayNode: cc.Node = null;



  state: GameState = GameState.IDLE;

  rng = new RNGService();
  payout = new PayoutService();

  credit: number = 1000;
  bet: number = 10;

  spinResult = null;

  onLoad() {
    this.ui.updateCredit(this.credit);
    this.endSpinSequence();
  }

  endSpinSequence() {
    // 停止可能還在跑的動畫
    if (this.stateStartNode) cc.Tween.stopAllByTarget(this.stateStartNode);
    this.lightNodes.forEach(node => { if (node) cc.Tween.stopAllByTarget(node); });

    // 待機時 stateWaitNode 亮燈，其餘不亮
    if (this.stateWaitNode) this.stateWaitNode.opacity = 255;
    if (this.stateStartNode) this.stateStartNode.opacity = 100;
    this.lightNodes.forEach(node => { if (node) node.opacity = 100; });
  }

  startSpinSequence() {
    // onSpinClick 狀態
    // stateWaitNode 不亮燈
    if (this.stateWaitNode) this.stateWaitNode.opacity = 100;

    // 先將所有燈光設為半透明 (暗色狀態)，並停止舊動畫
    if (this.stateStartNode) {
      cc.Tween.stopAllByTarget(this.stateStartNode);
      this.stateStartNode.opacity = 100;
    }

    this.lightNodes.forEach(node => {
      if (node) {
        cc.Tween.stopAllByTarget(node);
        node.opacity = 100;
      }
    });

    let delayTime = 0;
    const interval = 0.2; // 稍微調快間隔時間以配合旋轉速度

    // stateStartNode 亮燈
    if (this.stateStartNode) {
      cc.tween(this.stateStartNode)
        .delay(delayTime)
        .to(0.1, { opacity: 255 }) // 0.1秒內變成全亮
        .start();
    }

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
  onSpinClick() {
    cc.log("🎰 onSpinClick() called, current state:", this.state);
    if (this.state !== GameState.IDLE) {
      cc.log("❌ Not in IDLE state, ignoring spin");
      return;
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

    let totalWinMultipliers = 0;
    for (let i = 0; i < lines.length; i++) {
      let win = this.payout.evaluate(lines[i]);
      if (win > 0) {
        cc.log(`🎉 Line ${i} won ${win}x! Line:`, lines[i]);
        totalWinMultipliers += win;
      }
    }

    if (totalWinMultipliers > 0) {
      let coinsWon = totalWinMultipliers * this.bet;
      this.credit += coinsWon;
      this.ui.playWin();
      cc.log(`🎉 Total Win! You won ${coinsWon} credits (${totalWinMultipliers}x)`);
    }

    this.ui.updateCredit(this.credit);

    this.endSpinSequence(); // 一次spin結束後，將燈號還原到待機狀態
    this.state = GameState.IDLE;
  }
}