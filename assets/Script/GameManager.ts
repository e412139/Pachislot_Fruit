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

  state: GameState = GameState.IDLE;

  rng = new RNGService();
  payout = new PayoutService();

  credit: number = 1000;
  bet: number = 10;

  spinResult = null;

  onLoad() {
    this.ui.updateCredit(this.credit);
  }

  onSpinClick() {
    cc.log("🎰 onSpinClick() called, current state:", this.state);
    if (this.state !== GameState.IDLE) {
      cc.log("❌ Not in IDLE state, ignoring spin");
      return;
    }

    this.credit -= this.bet;
    this.ui.updateCredit(this.credit);

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

    this.reels.forEach((r, i) => {
      cc.log(`📌 Scheduling stop for reel ${i} with target:`, this.spinResult[i]);
      this.scheduleOnce(() => {
        r.stop(this.spinResult[i]);
      }, i * 0.5);
    });

    this.scheduleOnce(() => {
      this.onResult();
    }, 2);
  }

  onResult() {
    this.state = GameState.RESULT;

    let middleLine = [
      this.spinResult[0][1],
      this.spinResult[1][1],
      this.spinResult[2][1],
    ];

    let win = this.payout.evaluate(middleLine);

    if (win > 0) {
      this.credit += win * this.bet;
      this.ui.playWin();
    }

    this.ui.updateCredit(this.credit);

    this.state = GameState.IDLE;
  }
}