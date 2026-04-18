const { ccclass, property } = cc._decorator;

@ccclass
export default class LoadingCtrl extends cc.Component {

  /** 半透明遮罩背景（New Sprite(Splash)） */
  @property(cc.Node)
  bg: cc.Node = null;

  /** 載入動畫節點（anim_loading） */
  @property(cc.Node)
  animNode: cc.Node = null;

  onLoad() {
    // 預設隱藏整個 loading 畫面
    this.node.active = false;
  }

  onDestroy() {
    // 場景切換時停止動畫與 tween，避免殘留回呼
    // 用 isValid 檢查節點是否還存在
    if (cc.isValid(this.animNode)) {
      const anim = this.animNode.getComponent(cc.Animation);
      if (anim) {
        anim.stop();
      }
    }
    if (cc.isValid(this.bg)) {
      cc.Tween.stopAllByTarget(this.bg);
    }
  }

  /**
   * 顯示 loading 畫面並播放旋轉動畫，
   * 接著開始載入指定場景，載入完成後自動切換。
   */
  showLoading(sceneName: string) {
    this.node.active = true;

    // 淡入遮罩背景
    if (this.bg) {
      this.bg.opacity = 0;
      cc.tween(this.bg)
        .to(0.3, { opacity: 180 })
        .start();
    }

    // 播放 loading 旋轉動畫
    if (this.animNode) {
      const anim = this.animNode.getComponent(cc.Animation);
      if (anim) {
        const clip = anim.getClips()[0];
        if (clip) {
          clip.wrapMode = cc.WrapMode.Loop;
          anim.play(clip.name);
        }
      }
    }

    // 預載場景，完成後自動切換
    cc.director.preloadScene(sceneName, () => {
      cc.director.loadScene(sceneName);
    });
  }
}
