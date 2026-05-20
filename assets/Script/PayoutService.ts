import { SymbolType } from "./Enums";

export interface PayResult {
  coins: number;     // 中獎枚數（coinsWon = coins × bet / 3）
  triggerBB: boolean;  // 777 → BB 模式
  triggerRB: boolean;  // 77BAR → RB 模式
  isReplay: boolean;   // REPLAY × 3 → 下局免費
}

export default class PayoutService {

  evaluate(line: SymbolType[], isFreeGame: boolean = false): PayResult {
    const none: PayResult = { coins: 0, triggerBB: false, triggerRB: false, isReplay: false };

    // 777 → BB 模式，15枚
    if (this.all(line, SymbolType.SEVEN)) {
      return { coins: 15, triggerBB: true, triggerRB: false, isReplay: false };
    }

    // 77BAR → RB 模式，15枚
    if (line[0] === SymbolType.SEVEN && line[1] === SymbolType.SEVEN && line[2] === SymbolType.BAR) {
      return { coins: 15, triggerBB: false, triggerRB: true, isReplay: false };
    }

    // 銅鐘三連 → 15枚
    if (this.all(line, SymbolType.BELL)) {
      return { coins: 15, triggerBB: false, triggerRB: false, isReplay: false };
    }

    // 椰子三連 → 10枚
    if (this.all(line, SymbolType.COCONUT)) {
      return { coins: 10, triggerBB: false, triggerRB: false, isReplay: false };
    }

    // 西瓜三連 → 7枚（FG 中為 15枚）
    if (this.all(line, SymbolType.WATERMELON)) {
      return { coins: isFreeGame ? 15 : 7, triggerBB: false, triggerRB: false, isReplay: false };
    }

    // REPLAY 三連 → 0枚，下局免費
    if (this.all(line, SymbolType.REPLAY)) {
      return { coins: 0, triggerBB: false, triggerRB: false, isReplay: true };
    }

    return none;
  }

  private all(line: SymbolType[], sym: SymbolType): boolean {
    return line.every(s => s === sym);
  }
}
