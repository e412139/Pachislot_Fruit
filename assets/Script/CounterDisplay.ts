// CounterDisplay.ts
// 台數表 Prefab 元件（Grid 樣式）
// 完全用子節點名稱尋找，不依賴 prefab serialized reference

const { ccclass, property } = cc._decorator;

const COLOR_BB = cc.color(255, 80, 150);
const COLOR_RB = cc.color(60, 200, 220);
const BAR_IS_BB = [true, true, true, true, true, true, false, false, false, false];

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

    /** FG 觸發：記錄本次局數至長條圖，BB+1，SPIN COUNTER 歸零 */
    onBonusTriggered() {
        this._shiftBars(this.spinCounter);
        this.bbCount++;
        this.spinCounter = 0;
        this._updateLabels();
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

        let g = bar.getComponent(cc.Graphics);
        if (!g) g = bar.addComponent(cc.Graphics);
        g.clear();
        g.fillColor = BAR_IS_BB[index] ? COLOR_BB : COLOR_RB;
        g.rect(-bar.width / 2, 0, bar.width, bar.height);
        g.fill();
    }

    private _shiftBars(spinCounter: number) {
        // 新紀錄插入最左邊（index 0），舊資料往右移，最右邊移出
        for (let i = this.barGValues.length - 1; i > 0; i--) {
            this.barGValues[i] = this.barGValues[i - 1];
        }
        this.barGValues[0] = spinCounter;

        for (let i = 0; i < 10; i++) {
            this._renderBar(i, this.barGValues[i]);
        }
    }
}
