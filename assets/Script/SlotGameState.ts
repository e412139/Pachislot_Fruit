// SlotGameState.ts
// Alchemy Slot — 遊戲狀態定義

export enum SlotGameMode {
    NORMAL,
    FREE,  // 預留，目前不實作
}

export enum SlotGamePhase {
    IDLE,
    SPINNING,
    STOPPING,
    RESULT,
    PAYOUT,
}
