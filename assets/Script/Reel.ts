import SymbolComp from "./Symbol";
import { SymbolType } from "./Enums";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Reel extends cc.Component {

  @property(cc.Prefab)
  symbolPrefab: cc.Prefab = null;

  symbols: cc.Node[] = [];
  speed: number = 1000;
  isSpinning: boolean = false;
  isStopping: boolean = false;

  targetSymbols: SymbolType[] = [];

  symbolHeight: number = 60;
  
  // We use this to track which target symbol we should spawn next when stopping
  stoppingIndex: number = -1;

  start() {
    this.speed = 1000;
    this.initSymbols();
  }

  initSymbols() {
    // Clear out any placeholder nodes so they don't overlap as "Q"s
    this.node.removeAllChildren();
    this.symbols = [];

    for (let i = 0; i < 5; i++) {
      let node = cc.instantiate(this.symbolPrefab);
      node.parent = this.node;

      // 120, 60, 0, -60, -120
      node.y = 120 - i * this.symbolHeight;

      let symbolComp = node.getComponent(SymbolComp);
      if (symbolComp) {
        let randomSymbol = Math.floor(Math.random() * 4);
        symbolComp.setSymbol(randomSymbol);
      }

      this.symbols.push(node);
    }

    this.node.y = 0;
  }

  spin() {
    cc.log("🔄 Reel.spin() called");
    this.isSpinning = true;
    this.isStopping = false;
    this.stoppingIndex = -1;
  }

  stop(target: SymbolType[]) {
    cc.log("🛑 Reel.stop() called with target:", target);
    this.targetSymbols = target;
    this.isStopping = true;
    this.stoppingIndex = 2; // the bottom target symbol index to spawn first
  }

  update(dt: number) {
    if (!this.isSpinning) return;

    this.node.y -= this.speed * dt;

    if (this.node.y <= -this.symbolHeight) {
      this.node.y += this.symbolHeight;

      let last = this.symbols.pop();
      this.symbols.unshift(last);

      // Reassign accurate y coordinates
      for (let i = 0; i < 5; i++) {
        this.symbols[i].y = 120 - i * this.symbolHeight;
      }

      let symbolComp = this.symbols[0].getComponent(SymbolComp);
      if (symbolComp) {
        if (!this.isStopping) {
          // Normal spinning, just assign a random symbol
          let rand = Math.floor(Math.random() * 4);
          symbolComp.setSymbol(rand);
        } else {
          // We are stopping, so we should spawn the target symbols in reverse (lowest first)
          if (this.stoppingIndex >= 0) {
            symbolComp.setSymbol(this.targetSymbols[this.stoppingIndex]);
            this.stoppingIndex--;
          } else if (this.stoppingIndex === -1) {
            // One more turnover to push t0, t1, t2 into visible slots!
            let rand = Math.floor(Math.random() * 4);
            symbolComp.setSymbol(rand);
            this.stoppingIndex--; // turns to -2
          }
        }
      }
    }

    if (this.isStopping && this.stoppingIndex < -1) {
      this.tryStop();
    }
  }

  tryStop() {
    // Check if the current reel has completed its necessary offset 
    // to put the scheduled items in the middle 
    if (this.node.y <= 0 && this.node.y > -20) { 
      // Snap exactly into place
      this.alignToResult();
      this.isSpinning = false;
      this.isStopping = false;
      this.node.y = 0;
      cc.log("✅ Reel fully stopped");
    }
  }

  alignToResult() {
    // Force final align just to be perfectly sure
    // targets should be at indices 1, 2, 3
    for (let i = 0; i < 3; i++) {
      let symbolNode = this.symbols[i + 1];
      let symbolComp = symbolNode.getComponent(SymbolComp);
      if (symbolComp) {
        symbolComp.setSymbol(this.targetSymbols[i]);
      }
    }
  }
}
