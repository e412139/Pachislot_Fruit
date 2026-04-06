const { ccclass, property } = cc._decorator;

@ccclass
export default class UIController extends cc.Component {

  @property(cc.Label)
  creditLabel: cc.Label = null;

  updateCredit(value: number) {
    this.creditLabel.string = `Score: ${value.toLocaleString()}`;
  }

  playWin() {
    cc.log("WIN!");
  }
}