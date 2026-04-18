import LoadingCtrl from "./LoadingCtrl";

const { ccclass, property } = cc._decorator;

@ccclass
export default class LobbyController extends cc.Component {

  @property(cc.Node)
  node_liading: cc.Node = null;

  private _loadingCtrl: LoadingCtrl = null;

  onLoad() {
    if (this.node_liading) {
      this._loadingCtrl = this.node_liading.getComponent(LoadingCtrl);
    }
  }

  enterGame() {
    // 柏青
    if (this._loadingCtrl) {
      this._loadingCtrl.showLoading("game");
    } else {
      cc.director.loadScene("game");
    }
  }

  enterSlot() {
    if (this._loadingCtrl) {
      this._loadingCtrl.showLoading("slot");
    } else {
      cc.director.loadScene("slot");
    }
  }

}
