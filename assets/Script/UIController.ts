const { ccclass, property } = cc._decorator;

@ccclass
export default class UIController extends cc.Component {

  @property(cc.Label)
  creditLabel: cc.Label = null;

  updateCredit(value: number) {
    this.creditLabel.string = `Credit: ${value.toLocaleString()}`;
  }

  playWin() {
    cc.log("WIN!");
  }
}