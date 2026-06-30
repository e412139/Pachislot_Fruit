// SlotUICtrl.ts
// Alchemy Slot — UI 控制器
// 掛載位置：node_SlotGame（主節點）或 UI 父節點
//
// Inspector 連結：
//   scoreLabel        — 分數 Label
//   winLabel          — 贏分 Label
//   label_spinTitle   — Spin 按鈕預設文字節點
//   label_spinBtnCount— 顯示剩餘 Auto Spin 次數的 Label
//   node_spinBtn      — Spin 按鈕節點（用於全域點擊判定）
//   node_AutoSpinMenu — 自動旋轉選單（預設隱藏）
//   node_BigWinLayer  — 大獎遮罩層（預設隱藏）
//   sprite_titleWin   — 大獎標題圖片節點
//   label_num         — 大獎跑分 Label
//   sprite_bigWin / sprite_megaWin / sprite_superWin — SpriteFrame 資源
//   --- Free Game ---
//   sprite_bg         — 背景圖片節點 (cc.Sprite)
//   sprite_pot        — 鍋子圖片節點 (cc.Sprite)
//   bg_normal / bg_freeGame   — 背景圖替換素材 (cc.SpriteFrame)
//   pot_normal / pot_freeGame — 鍋子圖替換素材 (cc.SpriteFrame)
//   node_magicCircle  — 魔法圈轉場特效節點 (內含發光或粒子)

const { ccclass, property } = cc._decorator;

@ccclass
export default class SlotUICtrl extends cc.Component {

    // ─── 基本計分 ────────────────────────────────────────────
    @property(cc.Label)
    scoreLabel: cc.Label = null;

    @property(cc.Label)
    winLabel: cc.Label = null;

    // ─── Auto Spin ───────────────────────────────────────────
    @property(cc.Node)
    node_AutoSpinMenu: cc.Node = null;

    @property(cc.Node)
    node_spinBtn: cc.Node = null;      // 用於全域點擊判定

    @property(cc.Node)
    label_spinTitle: cc.Node = null;   // 按鈕上 "SPIN" 預設文字節點

    @property(cc.Label)
    label_spinBtnCount: cc.Label = null;

    // ─── BigWin 動畫 ─────────────────────────────────────────
    @property(cc.Node)
    node_BigWinLayer: cc.Node = null;

    @property(cc.Node)
    sprite_titleWin: cc.Node = null;

    @property(cc.Label)
    label_num: cc.Label = null;

    @property(cc.SpriteFrame)
    sprite_bigWin: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    sprite_megaWin: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    sprite_superWin: cc.SpriteFrame = null;

    @property(cc.Node)
    node_rdTestMune: cc.Node = null;

    // ─── Free Game 轉場與背景 ────────────────────────────────
    @property(cc.Sprite)
    sprite_bg: cc.Sprite = null;

    @property(cc.Sprite)
    sprite_pot: cc.Sprite = null;

    @property(cc.SpriteFrame)
    bg_normal: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    bg_freeGame: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    pot_normal: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    pot_freeGame: cc.SpriteFrame = null;

    @property(cc.Node)
    node_magicCircle: cc.Node = null;

    // ─── Free Game 專用 UI ────────────────────────────────────
    @property(cc.Node)
    node_fgCongratsLayout: cc.Node = null;

    @property(cc.Label)
    label_fgMultiplier: cc.Label = null;

    @property(cc.Node)
    node_fgMultiplierContainer: cc.Node = null; // 放倍數文字的外框

    @property(cc.Prefab)
    prefab_bottleFly: cc.Prefab = null; // 供飛行的空瓶碎片/圖案

    @property(cc.Node)
    node_fgTotalWinLayout: cc.Node = null; // FG 結算 Total Win 畫面

    @property(cc.Label)
    label_fgTotalWinScore: cc.Label = null; // FG 結算畫面的總分文字

    // ─── 說明介面 (Info Webview) 與跳轉 ───────────────────────
    @property(cc.Node)
    node_webViewInfo: cc.Node = null; // 整個說明介面層級

    @property(cc.WebView)
    webView: cc.WebView = null;

    @property(cc.TextAsset)
    rulesHtmlFile: cc.TextAsset = null;

    @property(cc.Prefab)
    prefab_loading: cc.Prefab = null;

    // ─── 生命週期 ────────────────────────────────────────────

    onLoad() {
        if (this.node_AutoSpinMenu) this.node_AutoSpinMenu.active = false;
        if (this.node_BigWinLayer) this.node_BigWinLayer.active = false;
        if (this.node_magicCircle) this.node_magicCircle.active = false;
        if (this.node_fgCongratsLayout) this.node_fgCongratsLayout.active = false;
        if (this.node_fgMultiplierContainer) this.node_fgMultiplierContainer.active = false;
        if (this.node_fgTotalWinLayout) this.node_fgTotalWinLayout.active = false;
        if (this.node_webViewInfo) this.node_webViewInfo.active = false;
        if (this.winLabel) this.winLabel.string = "";

        // 監聽 Web 平台的 postMessage
        if (cc.sys.isBrowser) {
            window.addEventListener('message', (event) => {
                if (event.data === 'cocos_close') this.hideInfo();
            });
        }

        // 全域點擊：點到選單外部則自動關閉
        if (cc.Canvas.instance && cc.Canvas.instance.node) {
            cc.Canvas.instance.node.on(
                cc.Node.EventType.TOUCH_START, this.onGlobalTouch, this, true
            );
        }
    }

    onDestroy() {
        if (cc.Canvas.instance && cc.Canvas.instance.node) {
            cc.Canvas.instance.node.off(
                cc.Node.EventType.TOUCH_START, this.onGlobalTouch, this, true
            );
        }
    }

    // ─── 計分 ────────────────────────────────────────────────

    updateScore(value: number) {
        if (this.scoreLabel) {
            this.scoreLabel.string = `Score: ${value.toLocaleString()}`;
        }
    }

    showWinAmount(coins: number) {
        if (this.winLabel) {
            this.winLabel.string = coins.toLocaleString();
        }
    }

    clearWinAmount() {
        if (this.winLabel) {
            this.winLabel.string = "";
        }
    }

    // ─── BigWin 動畫 ─────────────────────────────────────────

    hideBigWinLayer() {
        if (this.node_BigWinLayer) this.node_BigWinLayer.active = false;
        if (this.sprite_titleWin) cc.Tween.stopAllByTarget(this.sprite_titleWin);
    }

    /**
     * 播放大獎動畫（圖片彈出 + 跑分滾動）
     * @param coinsWon    實際贏得分數
     * @param multiplier  倍率（用於選擇標題圖片）
     * @param onCounterDone 跑分結束後的 callback（由 SlotGameCtrl 提供，停金幣/音效用）
     */
    showBigWinAnimation(coinsWon: number, multiplier: number, onCounterDone?: () => void) {
        if (!this.node_BigWinLayer || !this.sprite_titleWin) {
            cc.log("⚠️ SlotUICtrl: 大獎節點未綁定，略過動畫");
            return;
        }

        this.node_BigWinLayer.active = true;

        // 依倍率選標題圖片
        const spriteComp = this.sprite_titleWin.getComponent(cc.Sprite);
        if (spriteComp) {
            if (multiplier >= 200 && this.sprite_superWin) {
                spriteComp.spriteFrame = this.sprite_superWin;
            } else if (multiplier >= 100 && this.sprite_megaWin) {
                spriteComp.spriteFrame = this.sprite_megaWin;
            } else if (multiplier >= 50 && this.sprite_bigWin) {
                spriteComp.spriteFrame = this.sprite_bigWin;
            } else if (this.sprite_bigWin) { // Fallback
                spriteComp.spriteFrame = this.sprite_bigWin;
            }
        }

        // 標題圖片彈出 + 持續脈衝縮放 (Pulse Animation)
        cc.Tween.stopAllByTarget(this.sprite_titleWin);
        this.sprite_titleWin.scale = 0;
        cc.tween(this.sprite_titleWin)
            .to(0.4, { scale: 1.2 }, { easing: 'backOut' })
            .to(0.2, { scale: 1.0 })
            .call(() => {
                // 跑分期間不斷微微跳動
                cc.tween(this.sprite_titleWin)
                    .repeatForever(
                        cc.tween()
                            .to(0.3, { scale: 1.05 })
                            .to(0.3, { scale: 1.0 })
                    )
                    .start();
            })
            .start();

        // 跑分動畫（每幀更新）
        if (this.label_num) {
            this.label_num.string = "0";
            const duration = 2.0;
            const startTime = cc.director.getTotalTime();

            const counterFn = () => {
                const ratio = (cc.director.getTotalTime() - startTime) / (duration * 1000);
                if (ratio >= 1.0) {
                    this.label_num.string = coinsWon.toLocaleString();
                    this.unschedule(counterFn);
                    if (onCounterDone) onCounterDone();
                    this.scheduleOnce(() => { this.hideBigWinLayer(); }, 0.5);
                } else {
                    this.label_num.string = Math.floor(coinsWon * ratio).toLocaleString();
                }
            };
            this.schedule(counterFn, 0);
        }
    }

    // ─── Auto Spin 選單 ──────────────────────────────────────

    showAutoSpinMenu() {
        if (this.node_AutoSpinMenu) this.node_AutoSpinMenu.active = true;
    }

    hideAutoSpinMenu() {
        if (this.node_AutoSpinMenu) this.node_AutoSpinMenu.active = false;
    }

    /** 更新 Spin 按鈕顯示（0 = 還原預設，正數/−1 = 顯示次數） */
    updateSpinButton(autoSpinCount: number) {
        if (!this.label_spinBtnCount) return;

        if (autoSpinCount === 0) {
            this.label_spinBtnCount.node.active = false;
            if (this.label_spinTitle) this.label_spinTitle.active = true;
        } else {
            this.label_spinBtnCount.node.active = true;
            if (this.label_spinTitle) this.label_spinTitle.active = false;
            this.label_spinBtnCount.string =
                autoSpinCount === -1 ? "∞" : autoSpinCount.toString();
        }
    }

    // ─── 私有：全域點擊關閉選單 ─────────────────────────────
    private onRdTestBtnClick() {
        this.node_rdTestMune.active = !this.node_rdTestMune.active;
    }

    private onGlobalTouch(event: cc.Event.EventTouch) {
        const target = event.target as cc.Node;

        // 1. 處理 AutoSpin 選單：點選外部或非 Spin 按鈕則關閉
        if (this.node_AutoSpinMenu && this.node_AutoSpinMenu.active) {
            const isInsideAutoMenu = (target === this.node_AutoSpinMenu || target.isChildOf(this.node_AutoSpinMenu));
            const isClickSpinBtn = this.node_spinBtn && (target === this.node_spinBtn || target.isChildOf(this.node_spinBtn));

            if (!isInsideAutoMenu && !isClickSpinBtn) {
                this.node_AutoSpinMenu.active = false;
            }
        }

        // 2. 處理測試選單 (rdTest)：點選外部則關閉
        if (this.node_rdTestMune && this.node_rdTestMune.active) {
            const isInsideRdMenu = (target === this.node_rdTestMune || target.isChildOf(this.node_rdTestMune));

            // 如果點擊是在選單外，就自動隱藏
            if (!isInsideRdMenu) {
                this.node_rdTestMune.active = false;
            }
        }

        // 3. 處理遊戲說明 (WebView) 的自動關閉：點選 WebView 元件以外的區域則關閉
        if (this.node_webViewInfo && this.node_webViewInfo.active) {
            // Cocos 的 WebView DOM iframe 會攔截本身的點擊。
            // 會傳遞到這裡的通常是 Cocos 節點（例如半透明黑色背景遮罩）
            const isInsideWebView = this.webView && (target === this.webView.node || target.isChildOf(this.webView.node));
            if (!isInsideWebView) {
                this.hideInfo();
            }
        }
    }

    // ─── Free Game 轉場 ──────────────────────────────────────

    /**
     * 播放魔法圈轉場特效並替換背景
     * @param isEntering true: 進入 Free Game (切換為 fg 背景), false: 離開 (切換為普通背景)
     * @param onComplete 動畫遮擋點 (可在此刻刷新資料) 或結束 Callback
     */
    playMagicTransition(isEntering: boolean, onComplete?: () => void, onMidReveal?: () => void) {
        if (!this.node_magicCircle) {
            // 如果沒有魔法圈節點，直接換圖並 callback
            this.swapFreeGameBackground(isEntering);
            if (onMidReveal) onMidReveal();
            if (onComplete) onComplete();
            return;
        }

        this.node_magicCircle.active = true;
        this.node_magicCircle.opacity = 0;
        this.node_magicCircle.scale = 0;

        // 漸現放大遮擋畫面 -> 換圖 -> 縮小漸隱
        cc.tween(this.node_magicCircle)
            .parallel(
                cc.tween().to(0.5, { opacity: 255 }),
                cc.tween().to(0.5, { scale: 2.0 }, { easing: 'sineOut' })
            )
            .call(() => {
                this.swapFreeGameBackground(isEntering);
                if (onMidReveal) onMidReveal();
            })
            .delay(0.5) // 停留一下讓玩家感受到轉換
            .parallel(
                cc.tween().to(0.5, { opacity: 0 }),
                cc.tween().to(0.5, { scale: 0 })
            )
            .call(() => {
                this.node_magicCircle.active = false;
                if (onComplete) onComplete();
            })
            .start();
    }

    public swapFreeGameBackground(isEntering: boolean) {
        if (this.sprite_bg) {
            this.sprite_bg.spriteFrame = isEntering ? this.bg_freeGame : this.bg_normal;
        }
        if (this.sprite_pot) {
            this.sprite_pot.spriteFrame = isEntering ? this.pot_freeGame : this.pot_normal;
        }
        if (this.node_fgMultiplierContainer) {
            this.node_fgMultiplierContainer.active = isEntering;
        }
    }

    /** 顯示 FG 恭喜進場的 Layout 1.5秒 */
    showFGCongratsLayout(duration: number, onComplete: () => void) {
        if (!this.node_fgCongratsLayout) {
            if (onComplete) onComplete();
            return;
        }
        this.node_fgCongratsLayout.active = true;
        this.node_fgCongratsLayout.opacity = 0;
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

    // ─── FG 空瓶倍數動畫 ──────────────────────────────────────

    updateFGMultiplier(mult: number) {
        if (this.label_fgMultiplier) {
            this.label_fgMultiplier.string = `x${mult}`;
            // 讓字跳動一下
            cc.tween(this.label_fgMultiplier.node)
                .to(0.15, { scale: 1.5 })
                .to(0.15, { scale: 1.0 })
                .start();
        }
    }

    playBottleFlyAnimation(startWorldPos: cc.Vec2, onArrive: () => void) {
        if (!this.node_fgMultiplierContainer || !this.prefab_bottleFly) {
            if (onArrive) onArrive();
            return;
        }

        const flyNode = cc.instantiate(this.prefab_bottleFly);
        flyNode.parent = this.node; // 放在 UI 層

        const startLocal = this.node.convertToNodeSpaceAR(startWorldPos);
        flyNode.setPosition(startLocal);

        const targetWorld = this.node_fgMultiplierContainer.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const targetLocal = this.node.convertToNodeSpaceAR(targetWorld);

        cc.tween(flyNode)
            .to(0.5, { position: cc.v3(targetLocal.x, targetLocal.y, 0), scale: 0.5 }, { easing: 'cubicIn' })
            .call(() => {
                flyNode.destroy();
                if (onArrive) onArrive();
            })
            .start();
    }

    /** 顯示 FG 結算 Total Win 畫面 */
    showFGTotalWinLayout(totalWin: number, multiplier: number, duration: number, onComplete: () => void) {
        if (!this.node_fgTotalWinLayout) {
            cc.log("⚠️ 找不到 node_fgTotalWinLayout，直接結束");
            if (onComplete) onComplete();
            return;
        }

        if (this.label_fgTotalWinScore) {
            this.label_fgTotalWinScore.string = `Total Win: ${totalWin.toLocaleString()} (x${multiplier})`;
        }

        this.node_fgTotalWinLayout.active = true;
        this.node_fgTotalWinLayout.opacity = 0;

        cc.tween(this.node_fgTotalWinLayout)
            .to(0.3, { opacity: 255 })
            .delay(duration)
            .to(0.3, { opacity: 0 })
            .call(() => {
                this.node_fgTotalWinLayout.active = false;
                if (onComplete) onComplete();
            })
            .start();
    }

    // ─── 新增功能：返回與說明 ─────────────────────────────────

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
                loadingCtrl.showLoading("lobby");
                return;
            }
        }

        // Fallback: 如果沒有掛載 Prefab，就直接硬轉場
        cc.director.loadScene("lobby");
    }

    showInfo() {
        cc.log(`ℹ️ [SlotUICtrl] showInfo() 呼叫`);
        cc.log(`   - node_webViewInfo: ${this.node_webViewInfo ? "已連結" : "❌ 未連結"}`);
        cc.log(`   - webView: ${this.webView ? "已連結" : "❌ 未連結"}`);
        cc.log(`   - rulesHtmlFile: ${this.rulesHtmlFile ? "已連結" : "❌ 未連結"}`);

        if (this.node_webViewInfo) this.node_webViewInfo.active = true;
        if (this.webView) {
            this.webView.node.width = Math.min(600, cc.winSize.width - 20);
            this.webView.node.height = Math.min(1050, cc.winSize.height - 80);
        }

        if (this.webView && this.rulesHtmlFile) {
            // 註冊 JS Bridge 監聽 Scheme (cocos://close)
            this.webView.setJavascriptInterfaceScheme("cocos");
            this.webView.setOnJSCallback((target: cc.WebView, url: string) => {
                cc.log(`🔗 WebView Callback: ${url}`);
                if (url === "cocos://close") this.hideInfo();
            });

            // 載入 Data URI（使用 Base64 格式，避免 encodeURIComponent 對 Base64 圖片雙重編碼
            // 導致字串長度暴增、圖片被截斷的問題）
            const b64 = btoa(unescape(encodeURIComponent(this.rulesHtmlFile.text)));
            const uri = "data:text/html;charset=utf-8;base64," + b64;
            this.webView.url = uri;
            cc.log(`🌐 WebView 網址已設定 (Base64 長度: ${b64.length})`);
        }
    }

    hideInfo() {
        if (this.node_webViewInfo) this.node_webViewInfo.active = false;
    }

    /** 網頁端漂亮 iOS 提示窗 */
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
        overlay.style.backgroundColor = 'rgba(0,0,0,0.4)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '999999';
        overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

        const alertBox = document.createElement('div');
        alertBox.style.backgroundColor = 'rgba(255,255,255,0.85)';
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
        content.innerHTML = `<strong style="font-size: 17px; display: block; margin-bottom: 5px;">提示</strong>${message.replace(/\n/g, '<br>')}`;

        const btn = document.createElement('div');
        btn.innerText = '好';
        btn.style.borderTop = '1px solid rgba(60,60,67,0.36)';
        btn.style.color = '#007AFF';
        btn.style.fontSize = '17px';
        btn.style.fontWeight = '600';
        btn.style.padding = '12px';
        btn.style.cursor = 'pointer';

        btn.onclick = () => {
            document.body.removeChild(overlay);
        };

        alertBox.appendChild(content);
        alertBox.appendChild(btn);
        overlay.appendChild(alertBox);
        document.body.appendChild(overlay);
    }
}
