const { ccclass, property } = cc._decorator;

@ccclass
export default class SymbolComp extends cc.Component {

  @property(cc.Label)
  label: cc.Label = null;

  type: number = 0;

  setSymbol(type: number) {
    this.type = type;
    if (this.label) {
      this.label.string = this.getName(type);
      cc.log(`🔄 Symbol set to type ${type}, label: ${this.label.string}`);
    } else {
      cc.warn("❌ Label component not found in SymbolComp");
    }
  }

  getName(type: number): string {
    return ["🍏", "🍌", "🍓", "🍊", "🍉", "⭐"][type];
  }
}