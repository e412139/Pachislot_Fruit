// SlotRNG.ts
// Alchemy Slot — 加權亂數，產生 5×4 盤面
// matrix[col][row]: col = 0~4（哪個 Reel），row = 0~3（由上到下）

import { SlotSymbolID } from "./SlotSymbolDef";
import { SLOT_SYMBOL_WEIGHT } from "./SlotWeightTable";

export default class SlotRNG {

    private totalWeight: number = 0;

    constructor() {
        for (const key in SLOT_SYMBOL_WEIGHT) {
            this.totalWeight += SLOT_SYMBOL_WEIGHT[key];
        }
    }

    /** 取得單一隨機 Symbol（加權） */
    getRandomSymbol(): SlotSymbolID {
        let rand = Math.random() * this.totalWeight;
        for (const key in SLOT_SYMBOL_WEIGHT) {
            rand -= SLOT_SYMBOL_WEIGHT[key];
            if (rand <= 0) {
                return Number(key) as SlotSymbolID;
            }
        }
        return SlotSymbolID.S1;
    }

    /**
     * 產生完整盤面
     * @returns matrix[5][4]，matrix[col][row]
     */
    generateMatrix(): SlotSymbolID[][] {
        const result: SlotSymbolID[][] = [];
        for (let col = 0; col < 5; col++) {
            const column: SlotSymbolID[] = [];
            for (let row = 0; row < 4; row++) {
                column.push(this.getRandomSymbol());
            }
            result.push(column);
        }
        return result;
    }
}
