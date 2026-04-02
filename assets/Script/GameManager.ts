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
      cc.log(`📌 Stopping reel ${i} with target:`, this.spinResult[i]);
      r.stop(this.spinResult[i]);
    });

    this.scheduleOnce(() => {
      this.onResult();
    }, 1); // Reduces the result delay since they stop faster now
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

    this.state = GameState.IDLE;
  }
}