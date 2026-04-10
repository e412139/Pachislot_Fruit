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

    // ─── 生命週期 ────────────────────────────────────────────

    onLoad() {
        if (this.node_AutoSpinMenu) this.node_AutoSpinMenu.active = false;
        if (this.node_BigWinLayer)  this.node_BigWinLayer.active  = false;
        if (this.winLabel)          this.winLabel.string           = "";

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
        if (this.sprite_titleWin)  cc.Tween.stopAllByTarget(this.sprite_titleWin);
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
            if (multiplier >= 50 && this.sprite_superWin) {
                spriteComp.spriteFrame = this.sprite_superWin;
            } else if (multiplier >= 20 && this.sprite_megaWin) {
                spriteComp.spriteFrame = this.sprite_megaWin;
            } else if (this.sprite_bigWin) {
                spriteComp.spriteFrame = this.sprite_bigWin;
            }
        }

        // 標題圖片彈出
        cc.Tween.stopAllByTarget(this.sprite_titleWin);
        this.sprite_titleWin.scale = 0;
        cc.tween(this.sprite_titleWin)
            .to(0.4, { scale: 1.2 }, { easing: 'backOut' })
            .to(0.2, { scale: 1.0 })
            .start();

        // 跑分動畫（每幀更新）
        if (this.label_num) {
            this.label_num.string = "0";
            const duration  = 2.0;
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

    private onGlobalTouch(event: cc.Event.EventTouch) {
        if (!this.node_AutoSpinMenu || !this.node_AutoSpinMenu.active) return;
        const target = event.target as cc.Node;
        if (this.node_spinBtn &&
            (target === this.node_spinBtn || target.isChildOf(this.node_spinBtn))) return;
        if (target === this.node_AutoSpinMenu || target.isChildOf(this.node_AutoSpinMenu)) return;
        this.node_AutoSpinMenu.active = false;
    }
}
