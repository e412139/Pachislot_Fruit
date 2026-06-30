// SlotBigWinPresenter.ts
// 大獎演出：金幣噴射、BigWin 動畫、重複音效

import SlotUICtrl from "./SlotUICtrl";
import SlotPotCtrl from "./SlotPotCtrl";
import CoinSpawner from "./CoinSpawner";
import { IBigWinPresenter } from "./SlotInterfaces";

export default class SlotBigWinPresenter implements IBigWinPresenter {
    private bigWinAudioID: number = -1;

    constructor(
        private ui: SlotUICtrl,
        private pot: SlotPotCtrl,
        private coinSpawner: CoinSpawner,
        private bigWinAudio: cc.AudioClip
    ) {}

    showBigWin(coinsWon: number, multiplier: number, onComplete?: () => void): void {
        this.ui.showBigWinAnimation(coinsWon, multiplier, () => {
            this.stopBigWinEffects();
            if (this.pot) this.pot.playIdle();
            if (onComplete) onComplete();
        });

        if (this.coinSpawner) this.coinSpawner.startContinuousSpawning();

        if (this.bigWinAudio && this.bigWinAudioID === -1) {
            this.bigWinAudioID = cc.audioEngine.playEffect(this.bigWinAudio, true);
        }
    }

    stopBigWinEffects(): void {
        if (this.coinSpawner) this.coinSpawner.stopContinuousSpawning();
        if (this.bigWinAudioID !== -1) {
            cc.audioEngine.stopEffect(this.bigWinAudioID);
            this.bigWinAudioID = -1;
        }
    }
}
