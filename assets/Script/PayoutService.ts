import { SymbolType } from "./Enums";

export default class PayoutService {

  evaluate(line: SymbolType[]): number {

    // 處理 WILD
    let base = line.find(s => s !== SymbolType.WILD);

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