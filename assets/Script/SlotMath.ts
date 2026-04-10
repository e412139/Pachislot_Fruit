// SlotMath.ts
// Alchemy Slot — 真正的 Ways 計算
//
// Ways 機制說明：
//   對每一種 Symbol，從 Reel 0 開始向右，只要每個 Reel 上至少有 1 個
//   該 Symbol（或 WILD），就算連線。
//   中獎倍率 = paytable[sym][reelCount]
//   中獎 Ways 數 = 各 Reel 上符合的格數相乘
//   同一個 Symbol 只計算最長的連線（不重複計 3+4+5）

import { SlotSymbolID } from "./SlotSymbolDef";
import { SLOT_PAY_TABLE } from "./SlotPaytable";

export interface SlotWinResult {
    symbol: SlotSymbolID;
    reelCount: number;          // 連線幾個 Reel (3/4/5)
    ways: number;               // 本次命中的 Ways 數量
    multiplier: number;         // paytable 倍率
    totalPayout: number;        // ways × multiplier（總計倍率）
    winPositions: { col: number; row: number }[];  // 中獎格座標（供動畫閃爍用）
}

export default class SlotMath {

    /**
     * 計算全盤中獎
     * @param matrix matrix[col][row]，5 cols × 4 rows
     */
    static calculateWays(matrix: SlotSymbolID[][]): {
        totalMultiplier: number;
        results: SlotWinResult[];
        winPositions: { col: number; row: number }[];
    } {
        const COLS = matrix.length;       // 5
        const ROWS = matrix[0].length;    // 4

        // 只針對有賠率定義的 Symbol 計算（排除 WILD / SCATTER）
        const symbolsToCheck: SlotSymbolID[] = [
            SlotSymbolID.S1, SlotSymbolID.S2, SlotSymbolID.S3,
            SlotSymbolID.S4, SlotSymbolID.S5,
            SlotSymbolID.TEN, SlotSymbolID.J, SlotSymbolID.Q,
            SlotSymbolID.K, SlotSymbolID.A,
        ];

        const allResults: SlotWinResult[] = [];

        for (const sym of symbolsToCheck) {
            // 找出最長的連線長度（3/4/5），從最長開始計算，只取最大
            let bestResult: SlotWinResult | null = null;

            for (let reelCount = COLS; reelCount >= 3; reelCount--) {
                let valid = true;
                let ways = 1;
                const positions: { col: number; row: number }[] = [];

                for (let col = 0; col < reelCount; col++) {
                    let matchCount = 0;
                    const colPos: { col: number; row: number }[] = [];

                    for (let row = 0; row < ROWS; row++) {
                        const cell = matrix[col][row];
                        if (cell === sym || cell === SlotSymbolID.WILD) {
                            matchCount++;
                            colPos.push({ col, row });
                        }
                    }

                    if (matchCount === 0) {
                        valid = false;
                        break;
                    }

                    ways *= matchCount;
                    for (const p of colPos) positions.push(p);
                }

                if (valid) {
                    const multiplier = SLOT_PAY_TABLE[sym]?.[reelCount] || 0;
                    if (multiplier > 0) {
                        bestResult = {
                            symbol: sym,
                            reelCount,
                            ways,
                            multiplier,
                            totalPayout: ways * multiplier,
                            winPositions: positions,
                        };
                    }
                    // 找到最長有效連線就停止（不再計算更短的）
                    break;
                }
            }

            if (bestResult) {
                allResults.push(bestResult);
            }
        }

        // 合併所有中獎格座標（去重）
        const allWinPositions: { col: number; row: number }[] = [];
        for (const r of allResults) {
            for (const p of r.winPositions) {
                if (!allWinPositions.find(x => x.col === p.col && x.row === p.row)) {
                    allWinPositions.push(p);
                }
            }
        }

        const totalMultiplier = allResults.reduce((sum, r) => sum + r.totalPayout, 0);

        return { totalMultiplier, results: allResults, winPositions: allWinPositions };
    }

    /**
     * 計算盤面上的 Scatter 數量
     * @returns scatter 個數（≥3 觸發 Free Game）
     */
    static checkScatter(matrix: SlotSymbolID[][]): number {
        let count = 0;
        for (const col of matrix) {
            for (const sym of col) {
                if (sym === SlotSymbolID.SCATTER) count++;
            }
        }
        return count;
    }
}
