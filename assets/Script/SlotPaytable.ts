// SlotPaytable.ts
// Alchemy Slot — 賠率表
// key: SlotSymbolID，value: { 連線數: 倍率 }
import { SlotSymbolID } from "./SlotSymbolDef";

export const SLOT_PAY_TABLE: { [key: number]: { [reelCount: number]: number } } = {
    [SlotSymbolID.S1]: { 3: 15, 4: 40, 5: 100 },  // 最高價值
    [SlotSymbolID.S2]: { 3: 10, 4: 25, 5: 60 },
    [SlotSymbolID.S3]: { 3: 8, 4: 16, 5: 40 },
    [SlotSymbolID.S4]: { 3: 6, 4: 12, 5: 25 },
    [SlotSymbolID.S5]: { 3: 5, 4: 10, 5: 20 },
    [SlotSymbolID.TEN]: { 3: 3, 4: 6, 5: 10 },
    [SlotSymbolID.J]: { 3: 3, 4: 6, 5: 10 },
    [SlotSymbolID.Q]: { 3: 4, 4: 8, 5: 15 },
    [SlotSymbolID.K]: { 3: 4, 4: 8, 5: 15 },
    [SlotSymbolID.A]: { 3: 5, 4: 10, 5: 20 },
    [SlotSymbolID.WILD]: {},  // WILD 本身不計分，只作替代
    [SlotSymbolID.SCATTER]: {},  // SCATTER 觸發 Free（暫未實作）
};
