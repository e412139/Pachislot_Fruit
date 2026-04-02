// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

export enum GameState {
  IDLE,
  SPINNING,
  STOPPING,
  RESULT,
  PAYOUT
}

export enum SymbolType {
  A,
  B,
  C,
  D,
  WILD,
  SCATTER
}
