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
    this.unlockAudio(); // 趁著玩家點擊按鈕的瞬間，直接解鎖全域音訊

    if (this._loadingCtrl) {
      this._loadingCtrl.showLoading("game");
    } else {
      cc.director.loadScene("game");
    }
  }

  enterSlot() {
    this.unlockAudio(); // 趁著玩家點擊按鈕的瞬間，直接解鎖全域音訊

    if (this._loadingCtrl) {
      this._loadingCtrl.showLoading("slot");
    } else {
      cc.director.loadScene("slot");
    }
  }

  /**
   * 利用玩家在首頁真實點了按鈕的「當下」，同步解鎖 Web Audio Context。
   * 只要解鎖這一次，後面轉場完就直接播音樂，Safari 也不會再阻擋！
   */
  private unlockAudio() {
    if (cc.sys.isBrowser) {
        let context = (cc.sys as any).__audioSupport?.context;
        if (context && context.state === 'suspended') {
            cc.log("🔓 [Lobby] 藉由點擊按鈕，預先喚醒 Safari Web Audio Context");
            context.resume();
        }
    }
  }
}
