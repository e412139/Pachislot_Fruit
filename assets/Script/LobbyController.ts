import LoadingCtrl from "./LoadingCtrl";

const { ccclass, property } = cc._decorator;

@ccclass
export default class LobbyController extends cc.Component {

  @property(cc.Prefab)
  prefab_loading: cc.Prefab = null;

  enterGame() {
    this.unlockAudio(); // 趁著玩家點擊按鈕的瞬間，直接解鎖全域音訊
    this.showLoadingTransition("game");
  }

  enterSlot() {
    this.unlockAudio(); // 趁著玩家點擊按鈕的瞬間，直接解鎖全域音訊
    this.showLoadingTransition("slot");
  }

  private showLoadingTransition(sceneName: string) {
    if (this.prefab_loading) {
      let loadingNode = cc.instantiate(this.prefab_loading);

      if (cc.Canvas.instance && cc.Canvas.instance.node) {
        cc.Canvas.instance.node.addChild(loadingNode, 999);
      } else {
        this.node.addChild(loadingNode, 999);
      }

      let loadingCtrl = loadingNode.getComponent("LoadingCtrl");
      if (loadingCtrl) {
        loadingCtrl.showLoading(sceneName);
        return;
      }
    }

    // 如果沒有掛載 Prefab，就直接硬轉場
    cc.director.loadScene(sceneName);
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
