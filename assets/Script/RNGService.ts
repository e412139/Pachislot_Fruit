import { SymbolType } from "./Enums";

export default class RNGService {

  // 業界標準機率設計（總權重 100）
  // 目標：REPLAY≈1/7.4 · 🍒最左≈1/5 · 🍉三連≈1/19 · 🥥≈1/49 · 🔔≈1/116 · 777≈1/1600
  private table = [
    { type: SymbolType.SEVEN,      weight:  5 },  //  5%：777→BB（大獎），77BAR→RB
    { type: SymbolType.BAR,        weight:  8 },  //  8%：77BAR 第三輪觸發用
    { type: SymbolType.BELL,       weight: 12 },  // 12%：銅鐘三連 15枚
    { type: SymbolType.COCONUT,    weight: 16 },  // 16%：椰子三連 10枚
    { type: SymbolType.WATERMELON, weight: 22 },  // 22%：西瓜三連 7枚（FG中15枚）
    { type: SymbolType.CHERRY,     weight:  7 },  //  7%：最左輪出現即中 2枚
    { type: SymbolType.REPLAY,     weight: 30 },  // 30%：REPLAY三連免費下一轉
  ];

  getRandomSymbol(): SymbolType {
    let total = this.table.reduce((sum, t) => sum + t.weight, 0);
    let rand = Math.random() * total;
    for (let t of this.table) {
      if (rand < t.weight) return t.type;
      rand -= t.weight;
    }
    return SymbolType.WATERMELON;
  }

  getSpinResult(): SymbolType[][] {
    let result: SymbolType[][] = [];
    for (let i = 0; i < 3; i++) {
      let col: SymbolType[] = [];
      for (let j = 0; j < 3; j++) {
        col.push(this.getRandomSymbol());
      }
      result.push(col);
    }
    return result;
  }
}
