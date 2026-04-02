import { SymbolType } from "./Enums";

export default class RNGService {

  private table = [
    { type: SymbolType.A, weight: 5 },
    { type: SymbolType.B, weight: 10 },
    { type: SymbolType.C, weight: 20 },
    { type: SymbolType.D, weight: 30 },
    { type: SymbolType.WILD, weight: 3 },
    { type: SymbolType.SCATTER, weight: 2 },
  ];

  getRandomSymbol(): SymbolType {
    let total = this.table.reduce((sum, t) => sum + t.weight, 0);
    let rand = Math.random() * total;

    for (let t of this.table) {
      if (rand < t.weight) return t.type;
      rand -= t.weight;
    }
    return SymbolType.D;
  }

  // 回傳 3x3
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