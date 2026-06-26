// CounterDisplay.ts
// 台數表 Prefab 元件（Grid 樣式）
// 完全用子節點名稱尋找，不依賴 prefab serialized reference

const { ccclass, property } = cc._decorator;

const COLOR_BB = cc.color(255, 80, 150);
const COLOR_RB = cc.color(60, 200, 220);
// 移除靜態陣列，改為 instance 動態追蹤（見下方 barTypeIsBB）

const CHART_LEFT = -135;
const CHART_RIGHT = 125;
const CHART_BOTTOM = -50;
const CHART_TOP = 38;
const GRID_COUNT = 10;
const SPINS_PER_ROW = 100;

@ccclass
export default class CounterDisplay extends cc.Component {

    // 全部改為 private，不讓 CC2.x 序列化或重設這些值
    private bbCount: number = 0;
    private rbCount: number = 0;
    private spinCounter: number = 0;
    private barGValues: number[] = new Array(10).fill(0);
    // 每個 bar 的實際類型（true=BB, false=RB），隨 _shiftBars 一起位移
    private barTypeIsBB: boolean[] = [true, true, true, true, true, true, false, false, false, false];

    // 連莊箭頭（動態建立，不依賴 Inspector）
    private renzanNode: cc.Node = null;
    private renzanLabel: cc.Label = null;
    private renzanBarStart: number = 0;  // 最新（最左）renzan bar 的 index
    private renzanBarCount: number = 0;  // 連莊涵蓋的 bar 數量（= streak 次數）

    onLoad() {
        this._drawBackground();

        this.bbCount = Math.floor(Math.random() * 12) + 4;
        this.rbCount = Math.floor(Math.random() * 12) + 4;
        this.spinCounter = Math.floor(Math.random() * 200) + 30;

        cc.log('[CD] onLoad node.uuid=', this.node.uuid, 'spinCounter=', this.spinCounter);
        this._updateLabels();
        this._initBars();
    }

    /** 普通旋轉：SPIN COUNTER +1 */
    addNormalSpin() {
        this.spinCounter += 1;
        cc.log('[CD] addNormalSpin node.uuid=', this.node.uuid, 'spinCounter=', this.spinCounter);
        this._updateLabels();
    }

    /** 777 觸發 BB：記錄至長條圖，BB 回数 +1，SPIN COUNTER 歸零 */
    onBBTriggered() {
        this._shiftBars(this.spinCounter, true);
        this.bbCount++;
        this.spinCounter = 0;
        this._updateLabels();
    }

    /** 77BAR 觸發 RB：記錄至長條圖，RB 回数 +1，SPIN COUNTER 歸零 */
    onRBTriggered() {
        this._shiftBars(this.spinCounter, false);
        this.rbCount++;
        this.spinCounter = 0;
        this._updateLabels();
    }

    /** 向後相容別名 */
    onBonusTriggered() { this.onBBTriggered(); }

    // ─── 連莊箭頭 ──────────────────────────────────────────

    /**
     * 顯示/更新連莊箭頭（第 2 次以上才呼叫）
     * 必須在 _shiftBars 之後呼叫，箭頭會從 bar_0 起算涵蓋 streak 格
     * @param streak 總連莊數（2=連莊1次，3=連莊2次…）
     */
    showRenzan(streak: number) {
        if (!this.renzanNode) this._createRenzanNode();
        this.renzanBarStart = 0;       // 最新的 bar 永遠在 index 0
        this.renzanBarCount = streak;
        this.renzanNode.active = true;
        this._redrawRenzanArrow();
    }

    /** 隱藏連莊箭頭 */
    hideRenzan() {
        if (this.renzanNode) this.renzanNode.active = false;
        this.renzanBarCount = 0;
    }

    /** 依目前 renzanBarStart / renzanBarCount 重繪箭頭位置與寬度 */
    private _redrawRenzanArrow() {
        if (!this.renzanNode) return;

        // bar_0 的 x = -125，每格間距 26px（由場景量測）
        const BAR_X0 = -125;
        const SPACING = 26;
        const BAR_W = 18;

        const startX = BAR_X0 + SPACING * this.renzanBarStart;  // 最新 bar 中心
        const endX   = BAR_X0 + SPACING * (this.renzanBarStart + this.renzanBarCount - 1); // 最舊
        const centerX = (startX + endX) / 2;
        // N 根 bar 之間只有 N-1 個間距，正確公式如下
        const W = (this.renzanBarCount - 1) * SPACING + BAR_W;
        const H = 22;
        const TIP = 12; // 固定箭頭尖端寬度
        const halfH = H / 2;

        this.renzanNode.setPosition(centerX, 52);

        const g = this.renzanNode.getComponent(cc.Graphics);
        if (g) {
            g.clear();
            g.fillColor = cc.color(255, 60, 160);
            g.moveTo(-W / 2, 0);
            g.lineTo(-W / 2 + TIP, halfH);
            g.lineTo(W / 2, halfH);
            g.lineTo(W / 2, -halfH);
            g.lineTo(-W / 2 + TIP, -halfH);
            g.close();
            g.fill();
        }

        const labelNode = this.renzanNode.getChildByName('label_renzan_num');
        if (labelNode) {
            labelNode.setPosition(TIP / 2, 0);
            const lbl = labelNode.getComponent(cc.Label);
            if (lbl) lbl.string = this.renzanBarCount.toString();
        }
    }

    /** 初始建立箭頭容器（只建一次，內容由 _redrawRenzanArrow 填入） */
    private _createRenzanNode() {
        const arrowNode = new cc.Node('node_renzan');
        this.node.addChild(arrowNode);
        arrowNode.active = false;
        arrowNode.addComponent(cc.Graphics); // 佔位，_redrawRenzanArrow 負責繪製

        const labelNode = new cc.Node('label_renzan_num');
        arrowNode.addChild(labelNode);
        labelNode.color = cc.color(255, 255, 255);
        const lbl = labelNode.addComponent(cc.Label);
        lbl.fontSize = 18;
        lbl.lineHeight = 18;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = cc.Label.VerticalAlign.CENTER;
        this.renzanLabel = lbl;
        this.renzanNode = arrowNode;
    }

    // ─── 私有：直接用名稱找節點，完全跳過 serialized reference ──

    /** 設定 Label 文字（每次都重新找，避免 zombie reference） */
    private _setLabel(childName: string, text: string) {
        const n = this.node.getChildByName(childName);
        if (!n || !cc.isValid(n)) {
            cc.warn('[CD] _setLabel: node not found:', childName);
            return;
        }
        const lbl = n.getComponent(cc.Label);
        if (lbl) {
            lbl.string = text;
        } else {
            cc.warn('[CD] _setLabel: Label component not found on:', childName);
        }
    }

    /** 取得 Bar 節點（每次都重新找） */
    private _getBarNode(index: number): cc.Node | null {
        const n = this.node.getChildByName(`bar_${index}`);
        return (n && cc.isValid(n)) ? n : null;
    }

    private _updateLabels() {
        this._setLabel('label_bb', this.bbCount.toString().padStart(3, '0'));
        this._setLabel('label_rb', this.rbCount.toString().padStart(3, '0'));
        this._setLabel('label_spinCounter', this.spinCounter.toString());
    }

    private _drawBackground() {
        let g = this.node.getComponent(cc.Graphics);
        if (!g) g = this.node.addComponent(cc.Graphics);
        g.clear();

        const w = this.node.width;
        const h = this.node.height;

        g.fillColor = cc.color(18, 12, 38, 245);
        g.rect(-w / 2, -h / 2, w, h);
        g.fill();

        const cw = CHART_RIGHT - CHART_LEFT;
        const ch = CHART_TOP - CHART_BOTTOM;

        g.fillColor = cc.color(10, 8, 28, 255);
        g.rect(CHART_LEFT, CHART_BOTTOM, cw, ch);
        g.fill();

        g.strokeColor = cc.color(60, 60, 100, 180);
        g.lineWidth = 1;
        for (let i = 1; i < GRID_COUNT; i++) {
            const ly = CHART_BOTTOM + (ch / GRID_COUNT) * i;
            g.moveTo(CHART_LEFT, ly);
            g.lineTo(CHART_RIGHT, ly);
        }
        g.stroke();

        g.strokeColor = cc.color(80, 80, 150, 220);
        g.lineWidth = 1;
        g.rect(CHART_LEFT, CHART_BOTTOM, cw, ch);
        g.stroke();
    }

    private _initBars() {
        for (let i = 0; i < 10; i++) {
            const spins = Math.floor(Math.random() * 900) + 50;
            this.barGValues[i] = spins;
            this._renderBar(i, spins);
        }
    }

    private _renderBar(index: number, spins: number) {
        const bar = this._getBarNode(index);
        if (!bar) return;

        const chartH = CHART_TOP - CHART_BOTTOM;
        const cellH = chartH / GRID_COUNT;
        const cells = Math.min(Math.ceil(spins / SPINS_PER_ROW), GRID_COUNT);
        bar.height = Math.max(cells * cellH, 2);

        const isBB = this.barTypeIsBB[index];

        let g = bar.getComponent(cc.Graphics);
        if (!g) g = bar.addComponent(cc.Graphics);
        g.clear();
        g.fillColor = isBB ? COLOR_BB : COLOR_RB;
        g.rect(-bar.width / 2, 0, bar.width, bar.height);
        g.fill();

        // 同步更新底部 BB/RB 標籤
        const typeNode = this.node.getChildByName(`barType_${index}`);
        if (typeNode) {
            const lbl = typeNode.getComponent(cc.Label);
            if (lbl) {
                lbl.string = isBB ? 'BB' : 'RB';
                typeNode.color = isBB ? COLOR_BB : COLOR_RB;
            }
        }
    }

    private _shiftBars(spinCounter: number, isBB: boolean) {
        // 新紀錄插入最左邊（index 0），舊資料往右移，最右邊移出
        for (let i = this.barGValues.length - 1; i > 0; i--) {
            this.barGValues[i] = this.barGValues[i - 1];
            this.barTypeIsBB[i] = this.barTypeIsBB[i - 1]; // 類型也跟著位移
        }
        this.barGValues[0] = spinCounter;
        this.barTypeIsBB[0] = isBB; // 最新一筆的實際類型

        for (let i = 0; i < 10; i++) {
            this._renderBar(i, this.barGValues[i]);
        }

        // 每次 shift（新 bonus 插入）箭頭也往右移一格
        if (this.renzanNode && this.renzanNode.active && this.renzanBarCount >= 2) {
            this.renzanBarStart++;
            if (this.renzanBarStart + this.renzanBarCount - 1 > 9) {
                // 最舊的 renzan bar 已超出圖表右邊緣，隱藏箭頭
                this.hideRenzan();
            } else {
                this._redrawRenzanArrow();
            }
        }
    }
}
