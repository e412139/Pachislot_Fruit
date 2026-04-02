import { SymbolType } from "./Enums";

export default class PayoutService {

  evaluate(line: SymbolType[]): number {

    // 處理 WILD
    let base = line.find(s => s !== SymbolType.WILD);

    // 如果沒有 base，代表整條連線都是 WILD，給予最高倍率
    if (base === undefined) return 100;

    let normalized = line.map(s => s === SymbolType.WILD ? base : s);

    if (this.match(normalized, SymbolType.A)) return 50;
    if (this.match(normalized, SymbolType.B)) return 20;
    if (this.match(normalized, SymbolType.C)) return 10;
    if (this.match(normalized, SymbolType.D)) return 5;

    // SCATTER
    if (line.every(s => s === SymbolType.SCATTER)) return 100;

    return 0;
  }

  private match(line: SymbolType[], target: SymbolType): boolean {
    return line.every(s => s === target);
  }
}