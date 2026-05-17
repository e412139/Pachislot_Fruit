// SlotReelCtrl.ts
// Alchemy Slot — 單一滾輪控制（4 rows）
// 掛載位置：每個 node_SlotReel_* 節點
// 同節點需加 Mask 組件（矩形，高度 = ROW_COUNT × SYMBOL_HEIGHT）
// Inspector 連結：symbolPrefab, magicDoorPrefab

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

    @property(cc.Prefab)
    magicDoorPrefab: cc.Prefab = null;

    setSpeed(newSpeed: number) {
        this.speed = newSpeed;
    }

    // ─── 私有狀態 ────────────────────────────────────────────
    private symbols: cc.Node[] = [];
    private speed: number = 1500;
    private isSpinning: boolean = false;
    private isStopping: boolean = false;
    private offsetY: number = 0;
    private targetSymbols: SlotSymbolID[] = [];
    private stoppingIndex: number = -1;
    private stopCallback: Function = null;

    // ★ 巨型門：掛在 this.node（reel 節點），跟著 offsetY 同步滾動
    giantDoorNode: cc.Node = null;
    private doorBaseY: number = 0;  // snap 完成時門的 Y 值

    // ─── 初始化 ──────────────────────────────────────────────

    initSymbols() {
        this.node.removeAllChildren();
        this.symbols = [];
        this.offsetY = 0;
        this._destroyGiantDoor();

        const count = ROW_COUNT + 2; // 上下各一格緩衝
        for (let i = 0; i < count; i++) {
            const node = cc.instantiate(this.symbolPrefab);
            node.parent = this.node;
            node.y = TOP_Y + SYMBOL_HEIGHT - i * SYMBOL_HEIGHT;
            const comp = node.getComponent(SlotSymbolCtrl);
            if (comp) comp.setSymbol(Math.floor(Math.random() * 10) as SlotSymbolID);
            this.symbols.push(node);
        }
    }

    // ─── 公開介面 ────────────────────────────────────────────

    spin() {
        this.stopAllWinAnims();
        this.isSpinning = true;
        this.isStopping = false;
        this.stoppingIndex = -1;
        this.offsetY = 0;

        for (const sym of this.symbols) {
            if (sym) {
                const comp = sym.getComponent(SlotSymbolCtrl);
                if (comp) comp.setHidden(false);
            }
        }

        // 每次新的 spin 銷毀舊門
        this._destroyGiantDoor();
    }

    stop(targetSymbols: SlotSymbolID[], callback?: Function) {
        this.targetSymbols = targetSymbols;
        this.isStopping = true;
        this.stoppingIndex = ROW_COUNT - 1;
        this.stopCallback = callback || null;

        // ★ 如果目標有門，立刻生成並讓門跟著轉輪一起滾進來
        const hasDoor = targetSymbols.some(s => s === SlotSymbolID.MAGIC_DOOR);
        if (hasDoor && this.magicDoorPrefab && !this.giantDoorNode) {
            this._spawnScrollingDoor(targetSymbols);
        }
    }

    /**
     * 在 stop() 呼叫時立即生成巨型門，掛在 reel.node 上，
     * 從可見區下方出發，跟著 offsetY 一起往上滾動到 doorBaseY 的位置。
     */
    private _spawnScrollingDoor(targetSymbols: SlotSymbolID[]) {
        let firstDoorRow = -1;
        let doorCount = 0;
        for (let r = 0; r < ROW_COUNT; r++) {
            if (targetSymbols[r] === SlotSymbolID.MAGIC_DOOR) {
                if (firstDoorRow === -1) firstDoorRow = r;
                doorCount++;
            }
        }
        if (firstDoorRow < 0) return;

        let startRowOffset = 0;
        if (firstDoorRow === 0) {
            if (doorCount === 2) startRowOffset = -2;
            if (doorCount === 3) startRowOffset = -1;
            if (doorCount === 4) startRowOffset = 0;
        } else if (firstDoorRow > 0) {
            startRowOffset = firstDoorRow;
        }

        this.doorBaseY = startRowOffset * -100;

        // 目前轉輪正在滾，所以門從「doorBaseY - 幾格」的地方出發，跟著往上滾
        // 偏移量用 offsetY 繼續推算，這裡只需設好起始 Y
        // 只要 offsetY 一直往負走，門的 doorBaseY + offsetY 就會接近 doorBaseY
        // 所以起始 Y 可以就直接等於 doorBaseY（之後 update 會用 doorBaseY + offsetY 更新）
        // 但 offsetY 目前接近 0 或負值，所以門初始就會在正確位置附近，然後跟著輪子動
        this.giantDoorNode = cc.instantiate(this.magicDoorPrefab);
        this.giantDoorNode.parent = this.node;
        this.giantDoorNode.x = 0;
        this.giantDoorNode.y = this.doorBaseY + this.offsetY;
        this.giantDoorNode.zIndex = 999;
        cc.log(`🚪 生成巨型門 doorBaseY=${this.doorBaseY}, offsetY=${this.offsetY}`);
    }

    private _destroyGiantDoor() {
        if (this.giantDoorNode && cc.isValid(this.giantDoorNode)) {
            this.giantDoorNode.destroy();
        }
        this.giantDoorNode = null;
    }

    playWinAnimation(rowIndex: number) {
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
        return SlotSymbolID.S5;
    }

    forceUpdateAllSymbols(id: SlotSymbolID) {
        for (let i = 0; i < ROW_COUNT; i++) {
            const node = this.symbols[i + 1];
            if (node) {
                const comp = node.getComponent(SlotSymbolCtrl);
                if (comp) {
                    comp.setSymbol(id);
                    comp.setHidden(false);
                }
            }
        }
    }

    /** 瞬間強制改變所有可見格的隱藏狀態（擴展對齊動畫用） */
    forceSetAllHidden(isHidden: boolean) {
        for (let i = 0; i < ROW_COUNT; i++) {
            const node = this.symbols[i + 1];
            if (node) {
                const comp = node.getComponent(SlotSymbolCtrl);
                if (comp) comp.setHidden(isHidden);
            }
        }
    }

    getSymbolNodesByID(id: SlotSymbolID): cc.Node[] {
        const nodes: cc.Node[] = [];
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
    // 滾動中
    // ↓
    // 顯示隨機圖案

    // 開始停止
    // ↓
    // 依序塞 targetSymbols

    // 遇到 MAGIC_DOOR
    // ↓
    // 隱藏原圖

    // 全部塞完
    // ↓
    // 最後補一次隨機圖

    // 停止完成

    update(dt: number) {
        if (!this.isSpinning) return;

        this.offsetY -= this.speed * dt;

        if (this.offsetY <= -SYMBOL_HEIGHT) {
            this.offsetY += SYMBOL_HEIGHT;

            const last = this.symbols.pop();
            this.symbols.unshift(last);

            const comp = this.symbols[0].getComponent(SlotSymbolCtrl);
            if (comp) {
                if (!this.isStopping) {
                    comp.setSymbol(Math.floor(Math.random() * 10) as SlotSymbolID);
                    comp.setHidden(false);
                } else {
                    if (this.stoppingIndex >= 0) {
                        let targetSym = this.targetSymbols[this.stoppingIndex];
                        // 當該格被指定為大門時，大門會在這格上方，我們把格子本身的美術圖隱藏，避免重疊透視
                        if (targetSym === SlotSymbolID.MAGIC_DOOR) {
                            comp.setHidden(true);
                        } else {
                            comp.setSymbol(targetSym);
                            comp.setHidden(false);
                        }
                        this.stoppingIndex--;
                    } else if (this.stoppingIndex === -1) {
                        comp.setSymbol(Math.floor(Math.random() * 10) as SlotSymbolID);
                        comp.setHidden(false);
                        this.stoppingIndex--;
                    }
                }
            }
        }

        // 更新所有 symbol 的 Y 位置
        for (let i = 0; i < this.symbols.length; i++) {
            this.symbols[i].y = TOP_Y + SYMBOL_HEIGHT - i * SYMBOL_HEIGHT + this.offsetY;
        }

        // ★ 門跟著 offsetY 同步移動（這就是讓它像真實 symbol 一樣滾進來的關鍵！）
        if (this.giantDoorNode && cc.isValid(this.giantDoorNode)) {
            this.giantDoorNode.y = this.doorBaseY + this.offsetY;
        }

        if (this.isStopping && this.stoppingIndex < -1) {
            this.trySnap();
        }
    }

    // ─── 停輪對齊 ────────────────────────────────────────────

    private trySnap() {
        if (this.offsetY <= 0 && this.offsetY > -25) {
            this.snapToGrid();
        }
    }

    private snapToGrid() {
        this.isSpinning = false;
        this.isStopping = false;
        this.offsetY = 0;

        for (let i = 0; i < ROW_COUNT; i++) {
            const comp = this.symbols[i + 1].getComponent(SlotSymbolCtrl);
            let symTarget = this.targetSymbols[i];
            if (comp) {
                if (symTarget === SlotSymbolID.MAGIC_DOOR) {
                    comp.setHidden(true);
                } else {
                    comp.setSymbol(symTarget);
                    comp.setHidden(false);
                }
            }
        }

        for (let i = 0; i < this.symbols.length; i++) {
            this.symbols[i].y = TOP_Y + SYMBOL_HEIGHT - i * SYMBOL_HEIGHT;
        }

        // 也必須將門捕捉到最完美的最終網格位置
        if (this.giantDoorNode && cc.isValid(this.giantDoorNode)) {
            this.giantDoorNode.y = this.doorBaseY;
        }

        // ★ 門 snap 到最終精確位置
        if (this.giantDoorNode && cc.isValid(this.giantDoorNode)) {
            this.giantDoorNode.y = this.doorBaseY;
        }

        cc.log("✅ SlotReelCtrl: snap 完成");

        if (this.stopCallback) {
            const cb = this.stopCallback;
            this.stopCallback = null;
            cb();
        }
    }
}
