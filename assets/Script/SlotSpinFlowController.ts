// SlotSpinFlowController.ts
// 旋轉主流程：開始旋轉、停輪、魔法門擴展、對獎結算

import { SlotSymbolID } from "./SlotSymbolDef";
import SlotMath from "./SlotMath";
import SlotReelManager from "./SlotReelManager";
import SlotUICtrl from "./SlotUICtrl";
import SlotPotCtrl from "./SlotPotCtrl";
import { IScheduler, IBigWinPresenter, ISpinFlowDelegate } from "./SlotInterfaces";

const BIG_WIN_THRESHOLD = 50;

export default class SlotSpinFlowController {
    private spinMatrix: SlotSymbolID[][] = null;
    private currentBet: number = 0;
    private currentIsFreeGame: boolean = false;

    constructor(
        private reelManager: SlotReelManager,
        private pot: SlotPotCtrl,
        private ui: SlotUICtrl,
        private fireAudio: cc.AudioClip,
        private scheduler: IScheduler,
        private bigWin: IBigWinPresenter,
        private delegate: ISpinFlowDelegate
    ) {}

    startSpin(options: {
        bet: number;
        isFreeGame: boolean;
        isQuickSpin: boolean;
        matrix: SlotSymbolID[][];
    }): void {
        this.currentBet = options.bet;
        this.currentIsFreeGame = options.isFreeGame;
        this.spinMatrix = options.matrix;

        this.reelManager.stopAllWinAnimations();

        if (this.pot) {
            this.pot.stopAll();
            this.pot.playSpin();
        }

        this.reelManager.setQuickSpinMode(options.isQuickSpin);
        this.reelManager.spinAll();

        const waitToStop = options.isQuickSpin ? 0.2 : 1.0;
        this.scheduler.scheduleOnce(() => {
            this.delegate.onEnterStoppingPhase();
            this.reelManager.stopAll(this.spinMatrix, () => {
                this.onAllReelsStopped();
            });
        }, waitToStop);
    }

    private onAllReelsStopped(): void {
        this.delegate.onEnterResultPhase();

        const magicDoorCols: number[] = [];
        this.spinMatrix.forEach((col, idx) => {
            if (col.includes(SlotSymbolID.MAGIC_DOOR)) {
                magicDoorCols.push(idx);
            }
        });

        if (magicDoorCols.length >= 3) {
            this.handleMagicDoorExpansion(magicDoorCols);
            return;
        }

        this.processWaysResult();
    }

    private handleMagicDoorExpansion(cols: number[]): void {
        cc.log(`🚪 觸發魔法門擴展！共 ${cols.length} 輪`);

        const allowedRevealSymbols = [
            SlotSymbolID.S1, SlotSymbolID.S2, SlotSymbolID.S3, SlotSymbolID.S4, SlotSymbolID.S5,
            SlotSymbolID.TEN, SlotSymbolID.J, SlotSymbolID.Q, SlotSymbolID.K, SlotSymbolID.A,
            SlotSymbolID.WILD
        ];
        if (this.currentIsFreeGame) {
            allowedRevealSymbols.push(SlotSymbolID.BOTTLE);
        }

        const luckySymbol = allowedRevealSymbols[Math.floor(Math.random() * allowedRevealSymbols.length)];
        cc.log(`✨ 魔法門決定揭曉變成圖標：${SlotSymbolID[luckySymbol]}`);

        this.reelManager.playMagicDoorExpansion(cols, luckySymbol, this.spinMatrix, () => {
            this.processWaysResult();
        });
    }

    private processWaysResult(): void {
        const { totalMultiplier, results, winPositions } = SlotMath.calculateWays(this.spinMatrix);

        cc.log("📊 Ways 結果:", results.map(r =>
            `${SlotSymbolID[r.symbol]} x${r.reelCount}reels, ${r.ways}ways, ${r.totalPayout}x`
        ));
        cc.log("💰 總倍率 (totalMultiplier):", totalMultiplier);

        const isScatterTriggered = SlotMath.checkScatterTrigger(this.spinMatrix);
        const isBigWin = totalMultiplier >= BIG_WIN_THRESHOLD;

        let coinsWon = 0;

        if (totalMultiplier > 0) {
            coinsWon = totalMultiplier * this.currentBet;
            this.ui.showWinAmount(coinsWon);
            this.reelManager.playWinAnimations(winPositions);

            if (!isScatterTriggered && !this.currentIsFreeGame) {
                if (this.pot) this.pot.playWin(isBigWin);
                if (isBigWin) {
                    this.bigWin.showBigWin(coinsWon, totalMultiplier);
                } else if (this.fireAudio) {
                    cc.audioEngine.playEffect(this.fireAudio, false);
                }
            } else if (this.currentIsFreeGame) {
                if (this.pot) this.pot.playWin(isBigWin);
                if (this.fireAudio) cc.audioEngine.playEffect(this.fireAudio, false);
            }

            cc.log(`🎉 中獎！${coinsWon} 分（倍率 ${totalMultiplier}x）`);
        } else {
            if (this.pot) {
                this.scheduler.scheduleOnce(() => { this.pot.playIdle(); }, 0.3);
            }
        }

        this.delegate.onSpinResult({ totalMultiplier, coinsWon, isScatterTriggered, isBigWin });
    }
}
