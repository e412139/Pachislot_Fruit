const { ccclass, property } = cc._decorator;

@ccclass
export default class LobbyController extends cc.Component {

  enterGame() {
    // 柏青
    cc.director.loadScene("game");
  }

  enterSlot() {
    cc.director.loadScene("slot");
  }

}
