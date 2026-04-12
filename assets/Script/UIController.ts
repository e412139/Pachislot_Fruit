const { ccclass, property } = cc._decorator;

@ccclass
export default class UIController extends cc.Component {

  @property(cc.Label)
  scoreLabel: cc.Label = null;

  @property(cc.Node)
  node_webViewInfo: cc.Node = null; // 整個說明介面節點

  @property(cc.TextAsset)
  rulesHtmlFile: cc.TextAsset = null; // 我們剛寫好的本地網頁檔

  @property(cc.WebView)
  webView: cc.WebView = null; // 負責顯示網頁的元件

  // ==== 自動旋轉 (Auto Spin) ====
  @property(cc.Node)
  node_AutoSpinMenu: cc.Node = null; // 自動旋轉的次數選單

  @property(cc.Node)
  node_spinBtn: cc.Node = null; // 外部主 Spin 按鈕節點 (用於全局點擊判定)

  @property(cc.Node)
  label_spinTitle: cc.Node = null; // 原本按鈕上的 "Spin" 或 "開始" 文字節點

  @property(cc.Label)
  label_spinBtnCount: cc.Label = null; // 顯示剩餘次數的 Label

  // ==== 大獎動畫區 (Big Win) ====
  @property(cc.Node)
  node_BigWinLayer: cc.Node = null;

  @property(cc.Node)
  sprite_titleWin: cc.Node = null;

  @property(cc.Label)
  labelWinPoint: cc.Label = null;

  @property(cc.Label)
  label_num: cc.Label = null;

  @property(cc.SpriteFrame)
  sprite_megaWin: cc.SpriteFrame = null;

  @property(cc.SpriteFrame)
  sprite_superWin: cc.SpriteFrame = null;

  @property(cc.SpriteFrame)
  sprite_bigWin: cc.SpriteFrame = null;

  updateScore(value: number) {
    this.scoreLabel.string = `Score: ${value.toLocaleString()}`;
  }

  playWin() {
    cc.log("WIN!");
  }

  // ==== 大獎播映邏輯 ====

  /** 隱藏大獎展示層（只處理視覺節點，不管金幣與音效） */
  hideBigWinLayer() {
    if (this.node_BigWinLayer) {
      this.node_BigWinLayer.active = false;
    }
    if (this.sprite_titleWin) {
      cc.Tween.stopAllByTarget(this.sprite_titleWin);
    }
  }

  /**
   * 播放大獎動畫：圖片切換 + Tween 彈跳 + 跑分滾動
   * @param onCounterDone 跑分滾完時的回呼 (由 GameManager 提供，用來停金幣/停音效)
   */
  showBigWinAnimation(coinsWon: number, multiplier: number, onCounterDone?: () => void) {
    if (!this.node_BigWinLayer || !this.sprite_titleWin) {
      cc.log("⚠️ 大獎節點未綁定 UIController，略過動畫");
      return;
    }

    // 1. 顯示大框架
    this.node_BigWinLayer.active = true;

    // 2. 依據倍率替換圖片並彈跳出現
    let spriteComp = this.sprite_titleWin.getComponent(cc.Sprite);
    if (spriteComp) {
      if (multiplier >= 50) {
        spriteComp.spriteFrame = this.sprite_superWin;
      } else if (multiplier >= 20) {
        spriteComp.spriteFrame = this.sprite_megaWin;
      } else {
        spriteComp.spriteFrame = this.sprite_bigWin;
      }
    }

    cc.Tween.stopAllByTarget(this.sprite_titleWin);
    this.sprite_titleWin.scale = 0;
    cc.tween(this.sprite_titleWin)
      .to(0.4, { scale: 1.2 }, { easing: 'backOut' })
      .to(0.2, { scale: 1.0 })
      .start();

    // 3. 跑分滾動動畫 (從 0 滾到最終數字，歷時 2 秒)
    if (this.label_num) {
      this.label_num.string = "0";

      let duration = 2.0;
      let startTime = cc.director.getTotalTime();

      let counterCallback = () => {
        let now = cc.director.getTotalTime();
        let ratio = (now - startTime) / (duration * 1000);

        if (ratio >= 1.0) {
          this.label_num.string = coinsWon.toLocaleString();
          this.unschedule(counterCallback);

          // 跑分滾完 → 通知 GameManager 停止金幣與音效
          if (onCounterDone) onCounterDone();

          // 停留 0.5 秒後自動隱藏
          this.scheduleOnce(() => {
            this.hideBigWinLayer();
          }, 0.5);
        } else {
          let currentVal = Math.floor(coinsWon * ratio);
          this.label_num.string = currentVal.toLocaleString();
        }
      };

      this.schedule(counterCallback, 0); // 每幀執行
    }
  }

  /** 顯示贏分金額（所有中獎都會呼叫） */
  showWinAmount(coinsWon: number) {
    if (this.labelWinPoint) {
      this.labelWinPoint.string = coinsWon.toLocaleString();
    }
  }

  /** 清空贏分顯示（新一局開始時呼叫） */
  clearWinAmount() {
    if (this.labelWinPoint) {
      this.labelWinPoint.string = "";
    }
  }

  // ==== 自動旋轉 UI 控制 ====
  showAutoSpinMenu() {
    if (this.node_AutoSpinMenu) {
      this.node_AutoSpinMenu.active = true;
    }
  }

  hideAutoSpinMenu() {
    if (this.node_AutoSpinMenu) {
      this.node_AutoSpinMenu.active = false;
    }
  }

  updateSpinButton(autoSpinCount: number) {
    if (!this.label_spinBtnCount) return;

    if (autoSpinCount === 0) {
      // 狀態歸零：關閉剩下局數，還原預設文字
      this.label_spinBtnCount.node.active = false;
      if (this.label_spinTitle) {
        this.label_spinTitle.active = true;
      }
    } else {
      // 自動旋轉中：開啟局數，隱藏預設文字
      this.label_spinBtnCount.node.active = true;
      if (this.label_spinTitle) {
        this.label_spinTitle.active = false;
      }

      if (autoSpinCount === -1) {
        this.label_spinBtnCount.string = "infinite";
      } else if (autoSpinCount > 0) {
        this.label_spinBtnCount.string = autoSpinCount.toString();
      }
    }
  }

  private onGlobalTouch(event: cc.Event.EventTouch) {
    if (!this.node_AutoSpinMenu || !this.node_AutoSpinMenu.active) return;

    let targetNode = event.target as cc.Node;

    // 排除點擊自己 (Spin 按鈕)，讓它走自己該走的流程
    if (this.node_spinBtn && (targetNode === this.node_spinBtn || targetNode.isChildOf(this.node_spinBtn))) return;

    // 排除點擊選單自己與裡面的按鈕項目
    if (targetNode === this.node_AutoSpinMenu || targetNode.isChildOf(this.node_AutoSpinMenu)) return;

    // 都不是的話，就代表點在其他地方（空白處），自動收起選單
    cc.log("點擊空白處，關閉局數選單");
    this.node_AutoSpinMenu.active = false;
  }

  // ==== 說明介面 (Info Webview) 控制 ====

  onLoad() {
    // 0. 初始化 UI 狀態
    if (this.node_AutoSpinMenu) this.node_AutoSpinMenu.active = false;
    if (this.node_BigWinLayer) this.node_BigWinLayer.active = false;
    if (this.labelWinPoint) this.labelWinPoint.string = "";

    // 1. 監聯 Web 平台的 postMessage (因為 Cocos 在預覽模式下是用 iframe 渲染 WebView)
    if (cc.sys.isBrowser) {
      window.addEventListener('message', (event) => {
        if (event.data === 'cocos_close') {
          this.hideInfo();
        }
      });
    }

    // 2. 註冊全局觸控監聽（用於點擊選單外部關閉）
    if (cc.Canvas.instance && cc.Canvas.instance.node) {
      cc.Canvas.instance.node.on(cc.Node.EventType.TOUCH_START, this.onGlobalTouch, this, true);
    }
  }

  onDestroy() {
    // 將全局事件註銷
    if (cc.Canvas.instance && cc.Canvas.instance.node) {
      cc.Canvas.instance.node.off(cc.Node.EventType.TOUCH_START, this.onGlobalTouch, this, true);
    }
  }

  showInfo() {
    if (this.node_webViewInfo) {
      this.node_webViewInfo.active = true;
    }

    // 將本地端 HTML 轉換為 WebView 必定吃得到的 Data URI 格式，解決 404 找不到檔案的問題
    if (this.webView && this.rulesHtmlFile) {
      // 1. 註冊 JS Bridge 監聽 Scheme
      this.webView.setJavascriptInterfaceScheme("cocos");

      // 2. 註冊 Callback，當網頁內有 href="cocos://..." 時會觸發
      this.webView.setOnJSCallback((target: cc.WebView, url: string) => {
        if (url === "cocos://close") {
          this.hideInfo();
        }
      });

      // 3. 載入網頁
      this.webView.url = "data:text/html;charset=utf-8," + encodeURIComponent(this.rulesHtmlFile.text);
    }
  }

  hideInfo() {
    if (this.node_webViewInfo) {
      this.node_webViewInfo.active = false;
    }
  }

  // ==== 場景切換 ====

  backToLobby() {
    cc.log("🚀 返回大廳場景 (lobby)");
    cc.director.loadScene("lobby");
  }

  // ================= 網頁端漂亮 iOS 提示窗 =================
  showIOSAlert(message: string) {
    if (!cc.sys.isBrowser) {
      cc.log("Alert: " + message);
      return;
    }

    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    // 背景稍微變暗
    overlay.style.backgroundColor = 'rgba(0,0,0,0.4)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '999999';
    overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    const alertBox = document.createElement('div');
    alertBox.style.backgroundColor = 'rgba(255,255,255,0.85)';
    // 蘋果著名的毛玻璃特效
    alertBox.style.backdropFilter = 'blur(20px)';
    (alertBox.style as any).webkitBackdropFilter = 'blur(20px)';
    alertBox.style.borderRadius = '14px';
    alertBox.style.width = '270px';
    alertBox.style.textAlign = 'center';
    alertBox.style.display = 'flex';
    alertBox.style.flexDirection = 'column';
    alertBox.style.boxShadow = '0 4px 24px rgba(0,0,0,0.2)';

    const content = document.createElement('div');
    content.style.padding = '20px 16px';
    content.style.fontSize = '13px';
    content.style.color = '#000';
    content.style.lineHeight = '1.4';
    // 塞入標題與我們自定義的內文
    content.innerHTML = `<strong style="font-size: 17px; display: block; margin-bottom: 5px;">提示</strong>${message.replace(/\n/g, '<br>')}`;

    const btn = document.createElement('div');
    btn.innerText = '好';
    btn.style.borderTop = '1px solid rgba(60,60,67,0.36)';
    btn.style.color = '#007AFF';
    btn.style.fontSize = '17px';
    btn.style.fontWeight = '600';
    btn.style.padding = '12px';
    btn.style.cursor = 'pointer';

    // 點擊後直接消滅 DOM 節點
    btn.onclick = () => {
      document.body.removeChild(overlay);
    };

    alertBox.appendChild(content);
    alertBox.appendChild(btn);
    overlay.appendChild(alertBox);
    document.body.appendChild(overlay);
  }
}