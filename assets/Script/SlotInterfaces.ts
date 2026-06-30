// SlotInterfaces.ts
// 各子 Controller 的 delegate 介面與共用資料型別

/** 供非 cc.Component 的子 Controller 呼叫排程 */
export interface IScheduler {
    scheduleOnce(callback: Function, delay: number): void;
    unschedule(callback: Function): void;
}

/** 大獎演出 */
export interface IBigWinPresenter {
    showBigWin(coinsWon: number, multiplier: number, onComplete?: () => void): void;
    stopBigWinEffects(): void;
}

/** SpinFlow 回報給 SlotGameCtrl 的對獎結果 */
export interface SpinResultData {
    totalMultiplier: number;
    coinsWon: number;
    isScatterTriggered: boolean;
    isBigWin: boolean;
}

/** SpinFlowController → SlotGameCtrl */
export interface ISpinFlowDelegate {
    onEnterStoppingPhase(): void;
    onEnterResultPhase(): void;
    onSpinResult(result: SpinResultData): void;
}

/** FreeGameController → SlotGameCtrl */
export interface IFreeGameDelegate {
    onFreeGameEntered(): void;
    onFGNextSpin(): void;
    onFGBonusWin(extraWin: number): void;
    onFreeGameExited(): void;
}

/** InputHandler → SlotGameCtrl */
export interface IInputDelegate {
    onSpinRequested(): void;
}

/** AutoSpinController → SlotGameCtrl */
export interface IAutoSpinDelegate {
    onAutoSpinTick(): void;
}
