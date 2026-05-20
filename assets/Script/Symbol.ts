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
      // BAR 顯示黑色，其餘使用預設色
      this.label.node.color = type === 1
        ? cc.color(0, 0, 0, 255)
        : cc.color(255, 255, 255, 255);
    } else {
      cc.warn("❌ Label component not found in SymbolComp");
    }
  }

  getName(type: number): string {
    // SEVEN BAR BELL COCONUT WATERMELON CHERRY REPLAY
    return ["7️⃣", "BAR", "🔔", "🥥", "🍉", "🍒", "🔁"][type] ?? "?";
  }
}
