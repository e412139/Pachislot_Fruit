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

  // ==== Free Game 專用 UI ====
  @property(cc.Sprite)
  sprite_bg: cc.Sprite = null;

  @property(cc.SpriteFrame)
  bg_normal: cc.SpriteFrame = null;

  @property(cc.SpriteFrame)
  bg_freeGame: cc.SpriteFrame = null;

  @property(cc.Node)
  node_fgCongratsLayout: cc.Node = null;

  @property(cc.Node)
  node_fg_count: cc.Node = null; // FG 模式才顯示的局數計數框

  @property(cc.Label)
  label_fg_count: cc.Label = null; // node_fg_count 內的數字 Label

  @property(cc.Node)
  node_neonSnake: cc.Node = null;

  @property(cc.Prefab)
  prefab_loading: cc.Prefab = null;

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
    this.setNeonEffect(false);
    if (!this.node_BigWinLayer || !this.sprite_titleWin) {
      cc.log("⚠️ 大獎節點未綁定 UIController，略過動畫");
      return;
    }

    // 1. 顯示大框架
    this.node_BigWinLayer.active = true;

    // 2. 依據倍率替換圖片並彈跳出現
    let spriteComp = this.sprite_titleWin.getComponent(cc.Sprite);
    if (spriteComp) {
      // 方案 A：totalCoins 作為 multiplier 傳入
      // 30枚以上=SuperWin, 20枚=MegaWin, 10枚=BigWin
      if (multiplier >= 30) {
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
    let targetNode = event.target as cc.Node;

    // 1. 處理 AutoSpin 選單的自動關閉
    if (this.node_AutoSpinMenu && this.node_AutoSpinMenu.active) {
      let isSpinBtn = this.node_spinBtn && (targetNode === this.node_spinBtn || targetNode.isChildOf(this.node_spinBtn));
      let isAutoMenu = targetNode === this.node_AutoSpinMenu || targetNode.isChildOf(this.node_AutoSpinMenu);

      if (!isSpinBtn && !isAutoMenu) {
        cc.log("點擊空白處，關閉局數選單");
        this.node_AutoSpinMenu.active = false;
      }
    }

    // 2. 處理遊戲說明 (WebView) 的自動關閉
    if (this.node_webViewInfo && this.node_webViewInfo.active) {
      // 若點擊目標不是 webView 本身（例如點到半透明遮罩背景或其他地方）就關閉
      let isWebView = this.webView && (targetNode === this.webView.node || targetNode.isChildOf(this.webView.node));
      if (!isWebView) {
        this.hideInfo();
      }
    }
  }

  // ==== Free Game 轉場與背景控制 ====

  /**
   * 切換背景圖（白天/夜晚）
   */
  swapBackground(isFreeGame: boolean) {
    if (this.sprite_bg) {
      this.sprite_bg.spriteFrame = isFreeGame ? this.bg_freeGame : this.bg_normal;
      cc.log(`🖼️ 背景切換為: ${isFreeGame ? "FG (夜晚)" : "Normal (白天)"}`);
    }
  }

  /**
   * 展示進入 FG 的恭喜畫面
   */
  showFGCongrats(duration: number, onComplete: () => void, spinCount: number = 8, mode: string = 'BB') {
    if (!this.node_fgCongratsLayout) {
      if (onComplete) onComplete();
      return;
    }
    this.node_fgCongratsLayout.active = true;
    this.node_fgCongratsLayout.opacity = 0;

    // active 之後再更新局數，避免 CC2.x 重置 label
    // 同時更新 label_num 節點本身及其子節點（處理 outline/shadow 複製）
    const setAllLabels = (n: cc.Node, text: string) => {
      const lbl = n.getComponent(cc.Label);
      if (lbl) lbl.string = text;
      n.children.forEach(child => {
        const childLbl = child.getComponent(cc.Label);
        if (childLbl) childLbl.string = text;
      });
    };

    const numNode = this.node_fgCongratsLayout.getChildByName('label_num');
    if (numNode) setAllLabels(numNode, spinCount.toString());

    // 將 "FREE GAME" 改為傳入的模式名稱 (BB / RB)
    const detailNode = this.node_fgCongratsLayout.getChildByName('label_datail');
    if (detailNode) setAllLabels(detailNode, mode);
    cc.tween(this.node_fgCongratsLayout)
      .to(0.3, { opacity: 255 })
      .delay(duration - 0.6)
      .to(0.3, { opacity: 0 })
      .call(() => {
        this.node_fgCongratsLayout.active = false;
        if (onComplete) onComplete();
      })
      .start();
  }

  /** 顯示 / 隱藏 FG 局數計數框（只在 FG 模式期間顯示） */
  setFGCountVisible(visible: boolean) {
    if (this.node_fg_count) this.node_fg_count.active = visible;
  }

  /**
   * 更新 FG COUNT 顯示
   * @param value  顯示數值（剩餘轉數 或 累積純增枚數）
   * @param isRed  false=綠色(剩餘轉數)  true=紅色(累積純增)
   */
  setFGCount(value: number, isRed: boolean) {
    if (!this.label_fg_count) return;
    this.label_fg_count.string = value.toString();
    // 規格書：黑色 = 剩餘轉數(Remaining)，紅色 = 累積純增(Net Payout)
    this.label_fg_count.node.color = isRed
      ? new cc.Color(255, 60, 60)
      : new cc.Color(0, 0, 0);
  }

  /**
   * 切換霓虹燈特效開關
   */
  setNeonEffect(active: boolean) {
    if (this.node_neonSnake) {
      this.node_neonSnake.active = active;
      let anim = this.node_neonSnake.getComponent(cc.Animation);
      if (anim) {
        if (active) {
          // 強制指定動畫名稱播放，解決 Default Clip 偶爾失效的問題
          anim.play('anim_neon_fg_snake');
          cc.log("🎨 霓虹燈動畫：開始循環播放");
        } else {
          anim.stop();
          cc.log("🎨 霓虹燈動畫：停止並隱藏");
        }
      } else {
        cc.warn("⚠️ 找不到 NeonSnake 節點上的 Animation 組件！");
      }
    }
  }

  // ==== 說明介面 (Info Webview) 控制 ====

  onLoad() {
    // 0. 初始化 UI 狀態
    if (this.node_AutoSpinMenu) this.node_AutoSpinMenu.active = false;
    if (this.node_BigWinLayer) this.node_BigWinLayer.active = false;
    if (this.node_fgCongratsLayout) this.node_fgCongratsLayout.active = false;
    if (this.labelWinPoint) this.labelWinPoint.string = "";
    if (this.node_fg_count) this.node_fg_count.active = false; // 預設隱藏，只在 FG 模式顯示

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
      const canvas = cc.Canvas.instance;
      if (canvas) {
        const cw = canvas.node.width;
        const ch = canvas.node.height;

        // 背景遮罩：填滿 Canvas 正中央
        this.node_webViewInfo.setContentSize(cw, ch);
        this.node_webViewInfo.setPosition(0, 0);

        if (this.webView) {
          this.webView.node.width = Math.min(600, cc.winSize.width - 20);
          this.webView.node.height = Math.min(1050, cc.winSize.height - 80);
          this.webView.node.setPosition(0, 0);
        }
      }
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

      // 3. 載入網頁（使用 Base64 格式，避免 encodeURIComponent 對 Base64 圖片雙重編碼
      // 導致字串長度暴增、圖片被截斷的問題）
      const b64 = btoa(unescape(encodeURIComponent(this.rulesHtmlFile.text)));
      this.webView.url = "data:text/html;charset=utf-8;base64," + b64;
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
    // 如果有掛載 Loading Prefab，就動態生成並播放轉場動畫
    if (this.prefab_loading) {
      let loadingNode = cc.instantiate(this.prefab_loading);
      // 確保加在最上層
      if (cc.Canvas.instance && cc.Canvas.instance.node) {
        cc.Canvas.instance.node.addChild(loadingNode, 999);
      } else {
        this.node.addChild(loadingNode, 999);
      }

      let loadingCtrl = loadingNode.getComponent("LoadingCtrl");
      if (loadingCtrl) {
        // 從 LoadingCtrl 呼叫轉場，它帶有 opacity 動畫與 preload 機制
        loadingCtrl.showLoading("lobby");
        return;
      }
    }

    // Fallback: 如果沒有掛載 Prefab，就直接硬轉場
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