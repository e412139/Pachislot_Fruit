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
  offsetY: number = 0;

  // We use this to track which target symbol we should spawn next when stopping
  stoppingIndex: number = -1;
  stopCallback: Function = null;

  start() {
    this.speed = 1000;
    this.initSymbols();
  }

  initSymbols() {
    // Clear out any placeholder nodes so they don't overlap as "Q"s
    this.node.removeAllChildren();
    this.symbols = [];
    this.offsetY = 0;

    for (let i = 0; i < 5; i++) {
      let node = cc.instantiate(this.symbolPrefab);
      node.parent = this.node;

      // 120, 60, 0, -60, -120
      node.y = 120 - i * this.symbolHeight;

      let symbolComp = node.getComponent(SymbolComp);
      if (symbolComp) {
        let randomSymbol = Math.floor(Math.random() * 7);
        symbolComp.setSymbol(randomSymbol);
      }

      this.symbols.push(node);
    }

    this.node.y = 0;
  }

  spin() {
    cc.log("🔄 Reel.spin() called");
    this.resetAnimations();
    this.isSpinning = true;
    this.isStopping = false;
    this.stoppingIndex = -1;
  }

  resetAnimations() {
    for (let i = 0; i < this.symbols.length; i++) {
      if (this.symbols[i]) {
        cc.Tween.stopAllByTarget(this.symbols[i]);
        this.symbols[i].opacity = 255;
      }
    }
  }

  playWinAnimation(rowIndex: number) {
    let symbolNode = this.symbols[rowIndex + 1];
    if (symbolNode) {
      // 避免因為多條連線重複執行導致錯亂
      cc.Tween.stopAllByTarget(symbolNode);
      symbolNode.opacity = 255;
      cc.tween(symbolNode)
        .repeatForever(
          cc.tween()
            .to(0.3, { opacity: 50 }) // 稍微變淡
            .to(0.3, { opacity: 255 }) // 恢復全亮
        )
        .start();
    }
  }

  /**
   * 播放 Scatter (Start) 中獎動畫：旋轉 + 縮放脈衝
   */
  playScatterAnimation(rowIndex: number) {
    let symbolNode = this.symbols[rowIndex + 1];
    if (symbolNode) {
      cc.Tween.stopAllByTarget(symbolNode);
      symbolNode.opacity = 255;
      symbolNode.angle = 0;
      symbolNode.scale = 1.0;

      cc.tween(symbolNode)
        .to(0.75, { scale: 1.3, angle: 360 }, { easing: 'cubicOut' })
        .to(0.75, { scale: 1.0, angle: 720 }, { easing: 'cubicIn' })
        .start();
    }
  }

  stop(target: SymbolType[], callback?: Function) {
    cc.log("🛑 Reel.stop() called with target:", target);
    this.targetSymbols = target;
    this.isStopping = true;
    this.stoppingIndex = 2; // the bottom target symbol index to spawn first
    this.stopCallback = callback;
  }

  update(dt: number) {
    if (!this.isSpinning) return;

    this.offsetY -= this.speed * dt;

    if (this.offsetY <= -this.symbolHeight) {
      this.offsetY += this.symbolHeight;

      let last = this.symbols.pop();
      this.symbols.unshift(last);

      let symbolComp = this.symbols[0].getComponent(SymbolComp);
      if (symbolComp) {
        if (!this.isStopping) {
          // Normal spinning, just assign a random symbol
          let rand = Math.floor(Math.random() * 7);
          symbolComp.setSymbol(rand);
        } else {
          // We are stopping, so we should spawn the target symbols in reverse (lowest first)
          if (this.stoppingIndex >= 0) {
            symbolComp.setSymbol(this.targetSymbols[this.stoppingIndex]);
            this.stoppingIndex--;
          } else if (this.stoppingIndex === -1) {
            // One more turnover to push t0, t1, t2 into visible slots!
            let rand = Math.floor(Math.random() * 7);
            symbolComp.setSymbol(rand);
            this.stoppingIndex--; // turns to -2
          }
        }
      }
    }

    // Apply offset directly to symbols, keeping node stationary for the mask
    for (let i = 0; i < 5; i++) {
      this.symbols[i].y = 120 - i * this.symbolHeight + this.offsetY;
    }

    if (this.isStopping && this.stoppingIndex < -1) {
      this.tryStop();
    }
  }

  tryStop() {
    // Check if the current reel has completed its necessary offset 
    // to put the scheduled items in the middle 
    if (this.offsetY <= 0 && this.offsetY > -20) {
      // Snap exactly into place
      this.alignToResult();
      this.isSpinning = false;
      this.isStopping = false;
      this.offsetY = 0;

      for (let i = 0; i < 5; i++) {
        this.symbols[i].y = 120 - i * this.symbolHeight;
      }

      cc.log("✅ Reel fully stopped");
      if (this.stopCallback) {
        let cb = this.stopCallback;
        this.stopCallback = null;
        cb();
      }
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
