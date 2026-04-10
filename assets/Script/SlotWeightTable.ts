// SlotWeightTable.ts
// Alchemy Slot — 各 Symbol 出現權重（數值越大出現機率越高）
import { SlotSymbolID } from "./SlotSymbolDef";

export const SLOT_SYMBOL_WEIGHT: { [key: number]: number } = {
    [SlotSymbolID.S1]:      100,  // 液體
    [SlotSymbolID.S2]:       90,  // 藥草
    [SlotSymbolID.S3]:       70,  // 搗藥器
    [SlotSymbolID.S4]:       50,  // 玻璃瓶
    [SlotSymbolID.S5]:       30,  // 蒸餾器（最稀少高分）
    [SlotSymbolID.TEN]:     120,
    [SlotSymbolID.J]:       110,
    [SlotSymbolID.Q]:       100,
    [SlotSymbolID.K]:        90,
    [SlotSymbolID.A]:        80,
    [SlotSymbolID.WILD]:     20,
    [SlotSymbolID.SCATTER]:  15,
};
