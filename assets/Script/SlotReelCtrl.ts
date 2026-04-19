// SlotReelCtrl.ts
// Alchemy Slot — 單一滾輪控制（4 rows）
// 掛載位置：每個 node_SlotReel_* 節點
// 同節點需加 Mask 組件（矩形，高度 = ROW_COUNT × SYMBOL_HEIGHT）
// Inspector 連結：symbolPrefab

import { SlotSymbolID } from "./SlotSymbolDef";
import SlotSymbolCtrl from "./SlotSymbolCtrl";

const { ccclass, property } = cc._decorator;

const ROW_COUNT = 4;
const SYMBOL_HEIGHT = 100;   // px，需與 Prefab 高度一致
// 可見區最上排的 Y（Cocos Y 軸向上為正）
// 4 rows：Y = 150, 50, -50, -150
const TOP_Y = ((ROW_COUNT - 1) / 2) * SYMBOL_HEIGHT;  // 150

@ccclass
export default class SlotReelCtrl extends cc.Component {

    @property(cc.Prefab)
    symbolPrefab: cc.Prefab = null;

    /**
    * 動態變更滾輪轉速 (px/s)
    * @param newSpeed 目標速度
    */
    setSpeed(newSpeed: number) {
        this.speed = newSpeed;
    }

    // ─── 私有狀態 ────────────────────────────────────────────
    private symbols: cc.Node[] = [];
    private speed: number = 1500;    // px/s
    private isSpinning: boolean = false;
    private isStopping: boolean = false;
    private offsetY: number = 0;
    private targetSymbols: SlotSymbolID[] = [];
    private stoppingIndex: number = -1;      // 停輪時由下往上填入 target
    private stopCallback: Function = null;

    // 注意：initSymbols() 由 SlotReelManager.onLoad() 呼叫，不在 onLoad() 自動執行

    // ─── 初始化（由 SlotReelManager 呼叫）──────────────────────────

    initSymbols() {
        this.node.removeAllChildren();
        this.symbols = [];
        this.offsetY = 0;

        // 可見格(ROW_COUNT) + 上方緩衝1格 + 下方緩衝1格 = ROW_COUNT + 2
        const count = ROW_COUNT + 2;
        for (let i = 0; i < count; i++) {
            const node = cc.instantiate(this.symbolPrefab);
            node.parent = this.node;
            node.y = TOP_Y + SYMBOL_HEIGHT - i * SYMBOL_HEIGHT; // 第 0 個在最上緩衝
            const comp = node.getComponent(SlotSymbolCtrl);
            if (comp) {
                comp.setSymbol(Math.floor(Math.random() * 10) as SlotSymbolID);
            }
            this.symbols.push(node);
        }
    }

    // ─── 公開介面 ────────────────────────────────────────────

    /** 開始旋轉 */
    spin() {
        this.stopAllWinAnims();
        this.isSpinning = true;
        this.isStopping = false;
        this.stoppingIndex = -1;
        this.offsetY = 0;
    }

    /**
     * 停輪
     * @param targetSymbols 目標盤面（長度需為 ROW_COUNT）
     * @param callback 完全停止並 snap 對齊後呼叫
     */
    stop(targetSymbols: SlotSymbolID[], callback?: Function) {
        this.targetSymbols = targetSymbols;
        this.isStopping = true;
        this.stoppingIndex = ROW_COUNT - 1;  // 從最下方的 row 開始往上填
        this.stopCallback = callback || null;
    }

    playWinAnimation(rowIndex: number) {
        // rowIndex 0 = 最上排，對應 symbols[1]（symbols[0] 是上緩衝格）
        const node = this.symbols[rowIndex + 1];
        if (node) {
            const comp = node.getComponent(SlotSymbolCtrl);
            if (comp) comp.playWinAnim();
        }
    }

    stopAllWinAnims() {
        for (const node of this.symbols) {
            if (node) {
                const comp = node.getComponent(SlotSymbolCtrl);
                if (comp) comp.stopWinAnim();
            }
        }
    }

    getSymbolAt(rowIndex: number): SlotSymbolID {
        const node = this.symbols[rowIndex + 1];
        if (node) {
            const comp = node.getComponent(SlotSymbolCtrl);
            if (comp) return comp.getSymbol();
        }
        return SlotSymbolID.S1;
    }

    /** 取得可見區域內特定 ID 的 cc.Node */
    getSymbolNodesByID(id: SlotSymbolID): cc.Node[] {
        const nodes: cc.Node[] = [];
        // 只掃描可見格 symbols[1] ~ symbols[ROW_COUNT]
        for (let i = 0; i < ROW_COUNT; i++) {
            const node = this.symbols[i + 1];
            if (node) {
                const comp = node.getComponent(SlotSymbolCtrl);
                if (comp && comp.getSymbol() === id) {
                    nodes.push(node);
                }
            }
        }
        return nodes;
    }

    // ─── Update 主循環 ───────────────────────────────────────

    update(dt: number) {
        if (!this.isSpinning) return;

        this.offsetY -= this.speed * dt;

        // 每當整體位移超過一格高度，循環滾動
        if (this.offsetY <= -SYMBOL_HEIGHT) {
            this.offsetY += SYMBOL_HEIGHT;

            // 將最後一個 symbol 移到陣列最前面（循環）
            const last = this.symbols.pop();
            this.symbols.unshift(last);

            // 更新新進入頂部的 symbol 內容
            const comp = this.symbols[0].getComponent(SlotSymbolCtrl);
            if (comp) {
                if (!this.isStopping) {
                    // 正常旋轉：隨機
                    comp.setSymbol(Math.floor(Math.random() * 10) as SlotSymbolID);
                } else {
                    // 停輪中：從下往上依序填入 target
                    if (this.stoppingIndex >= 0) {
                        comp.setSymbol(this.targetSymbols[this.stoppingIndex]);
                        this.stoppingIndex--;
                    } else if (this.stoppingIndex === -1) {
                        // 再多一格緩衝（讓 target 完全進入可見區）
                        comp.setSymbol(Math.floor(Math.random() * 10) as SlotSymbolID);
                        this.stoppingIndex--; // => -2
                    }
                }
            }
        }

        // 更新所有 symbol 的 Y 位置
        const bufferCount = this.symbols.length;
        for (let i = 0; i < bufferCount; i++) {
            this.symbols[i].y = TOP_Y + SYMBOL_HEIGHT - i * SYMBOL_HEIGHT + this.offsetY;
        }

        // 當 target 已全部進入且接近 snap 點時停輪
        if (this.isStopping && this.stoppingIndex < -1) {
            this.trySnap();
        }
    }

    // ─── 停輪對齊 ────────────────────────────────────────────

    private trySnap() {
        // offsetY ≈ 0 時表示恰好對齊格子中心
        if (this.offsetY <= 0 && this.offsetY > -25) {
            this.snapToGrid();
        }
    }

    private snapToGrid() {
        this.isSpinning = false;
        this.isStopping = false;
        this.offsetY = 0;

        // 強制校正可見格（symbols[1] ~ symbols[ROW_COUNT]）
        for (let i = 0; i < ROW_COUNT; i++) {
            const comp = this.symbols[i + 1].getComponent(SlotSymbolCtrl);
            if (comp) comp.setSymbol(this.targetSymbols[i]);
        }

        // 全部 symbol 回到整齊位置
        for (let i = 0; i < this.symbols.length; i++) {
            this.symbols[i].y = TOP_Y + SYMBOL_HEIGHT - i * SYMBOL_HEIGHT;
        }

        cc.log("✅ SlotReelCtrl: snap 完成");

        if (this.stopCallback) {
            const cb = this.stopCallback;
            this.stopCallback = null;
            cb();
        }
    }
}
