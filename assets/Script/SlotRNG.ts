// SlotRNG.ts
// Alchemy Slot — 加權亂數，產生 5×4 盤面
// matrix[col][row]: col = 0~4（哪個 Reel），row = 0~3（由上到下）

import { SlotSymbolID } from "./SlotSymbolDef";
import { SLOT_SYMBOL_WEIGHT, FG_SLOT_SYMBOL_WEIGHT } from "./SlotWeightTable";

export default class SlotRNG {

    private totalWeightNormal: number = 0;
    private totalWeightFG: number = 0;

    constructor() {
        for (const key in SLOT_SYMBOL_WEIGHT) {
            this.totalWeightNormal += SLOT_SYMBOL_WEIGHT[key];// 985
        }
        for (const key in FG_SLOT_SYMBOL_WEIGHT) {
            this.totalWeightFG += FG_SLOT_SYMBOL_WEIGHT[key];
        }
    }

    /** 取得單一隨機 Symbol（加權） */
    getRandomSymbol(isFreeGame: boolean): SlotSymbolID {
        const table = isFreeGame ? FG_SLOT_SYMBOL_WEIGHT : SLOT_SYMBOL_WEIGHT;
        let rand = Math.random() * (isFreeGame ? this.totalWeightFG : this.totalWeightNormal);
        for (const key in table) {
            rand -= table[key];// 每次扣掉該 symbol 的權重
            if (rand <= 0) {
                return Number(key) as SlotSymbolID; // 第一個讓 rand 掉到 ≤ 0 的就是本次結果
            }
        }
        return SlotSymbolID.S5;
    }

    /**
     * 產生完整盤面
     * @returns matrix[5][4]，matrix[col][row]
     */
    generateMatrix(isFreeGame: boolean = false): SlotSymbolID[][] {
        const result: SlotSymbolID[][] = [];
        for (let col = 0; col < 5; col++) {
            const column: SlotSymbolID[] = [];
            let hasDoorInNormalRng = false;

            for (let row = 0; row < 4; row++) {
                const sym = this.getRandomSymbol(isFreeGame);
                // 暫時將盤面排滿，避免中斷
                column.push(sym);
            }

            // 將整個輪軸進行一次 MAGIC_DOOR 生成判定
            const totalWeight = isFreeGame ? this.totalWeightFG : this.totalWeightNormal;
            const doorWeight = isFreeGame ? FG_SLOT_SYMBOL_WEIGHT[SlotSymbolID.MAGIC_DOOR] : SLOT_SYMBOL_WEIGHT[SlotSymbolID.MAGIC_DOOR];

            // 以權重換算機率，每輪進行一次判定 (此處將門的單格機率放大為整輪的觸發率，或直接用原本的機率)
            // 為了保持機率一致，我們使用單一權重比例做檢查，如果在正常亂數中已經抽過，可以當作觸發。
            // 但門的總體出現率應該維持在設計範圍，所以我們直接在這裡抽籤
            if (Math.random() * totalWeight < doorWeight) {
                // 如果命中魔法門，必定以「連續多格」形式出現在輪軸中
                // 虛擬起始列 (startRow) 範圍：
                // -2: 覆蓋 0,1
                // -1: 覆蓋 0,1,2
                //  0: 覆蓋 0,1,2,3
                //  1: 覆蓋 1,2,3
                //  2: 覆蓋 2,3
                const validStarts = [-2, -1, 0, 1, 2];
                const startRow = validStarts[Math.floor(Math.random() * validStarts.length)];

                // 把舊的 MAGIC_DOOR 洗掉換成一般符號（防呆）
                for (let r = 0; r < 4; r++) {
                    if (column[r] === SlotSymbolID.MAGIC_DOOR) {
                        column[r] = SlotSymbolID.S5;
                    }
                }

                // 置入連續的 MAGIC_DOOR
                for (let r = startRow; r < startRow + 4; r++) {
                    if (r >= 0 && r < 4) {
                        column[r] = SlotSymbolID.MAGIC_DOOR;
                    }
                }
            } else {
                // 如果沒抽中大門，就把一般 RNG 不小心骰到的門洗掉 (因為大門不能是獨立的一格)
                for (let r = 0; r < 4; r++) {
                    if (column[r] === SlotSymbolID.MAGIC_DOOR) {
                        column[r] = SlotSymbolID.S5;
                    }
                }
            }

            result.push(column);
        }
        return result;
    }
}
