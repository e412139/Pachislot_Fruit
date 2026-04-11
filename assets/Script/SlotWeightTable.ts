// SlotWeightTable.ts
// Alchemy Slot — 各 Symbol 出現權重（數值越大出現機率越高）
import { SlotSymbolID } from "./SlotSymbolDef";

export const SLOT_SYMBOL_WEIGHT: { [key: number]: number } = {
    [SlotSymbolID.S5]: 100,
    [SlotSymbolID.S4]: 90,
    [SlotSymbolID.S3]: 70,
    [SlotSymbolID.S2]: 50,
    [SlotSymbolID.S1]: 30,   //（最稀少高分）
    [SlotSymbolID.TEN]: 120,
    [SlotSymbolID.J]: 110,
    [SlotSymbolID.Q]: 100,
    [SlotSymbolID.K]: 90,
    [SlotSymbolID.A]: 80,
    [SlotSymbolID.WILD]: 20,
    [SlotSymbolID.SCATTER]: 15,
    [SlotSymbolID.BOTTLE]: 0,  // 普通模式不出現
};

// Free Game 專用權重表
export const FG_SLOT_SYMBOL_WEIGHT: { [key: number]: number } = {
    [SlotSymbolID.S5]: 100,
    [SlotSymbolID.S4]: 90,
    [SlotSymbolID.S3]: 70,
    [SlotSymbolID.S2]: 50,
    [SlotSymbolID.S1]: 30,
    [SlotSymbolID.TEN]: 120,
    [SlotSymbolID.J]: 110,
    [SlotSymbolID.Q]: 100,
    [SlotSymbolID.K]: 90,
    [SlotSymbolID.A]: 80,
    [SlotSymbolID.WILD]: 25,
    [SlotSymbolID.SCATTER]: 0,  // FG 中不出現 Scatter
    [SlotSymbolID.BOTTLE]: 30,  // FG 專用空瓶
};
