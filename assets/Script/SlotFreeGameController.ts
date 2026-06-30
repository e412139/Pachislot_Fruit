// SlotFreeGameController.ts
// Free Game 完整流程：進場準備、局間旋轉、空瓶倍率、結算退場

import { SlotSymbolID } from "./SlotSymbolDef";
import SlotReelManager from "./SlotReelManager";
import SlotUICtrl from "./SlotUICtrl";
import SlotPotCtrl from "./SlotPotCtrl";
import CoinSpawner from "./CoinSpawner";
import { IScheduler, IBigWinPresenter, IFreeGameDelegate } from "./SlotInterfaces";

const BIG_WIN_THRESHOLD = 50;

export default class SlotFreeGameController {
    public freeSpinsLeft: number = 0;

    private freeGameTotalWin: number = 0;
    private fgMultiplier: number = 2;
    private currentBet: number = 0;

    constructor(
        private reelManager: SlotReelManager,
        private pot: SlotPotCtrl,
        private ui: SlotUICtrl,
        private coinSpawner: CoinSpawner,
        private scheduler: IScheduler,
        private bigWin: IBigWinPresenter,
        private sfxFGTrigger: cc.AudioClip,
        private sfxEmptyBottle: cc.AudioClip,
        private bgmNormal: cc.AudioClip,
        private bgmFreeGame: cc.AudioClip,
        private delegate: IFreeGameDelegate
    ) {}

    prepareEnterFreeGame(): void {
        this.ui.clearWinAmount();
        this.reelManager.stopAllWinAnimations();

        const scatterNodes = this.reelManager.getSymbolNodesByID(SlotSymbolID.SCATTER);
        cc.log(`✨ 找到 ${scatterNodes.length} 個 Scatter 準備旋轉動畫`);

        if (this.sfxFGTrigger) {
            cc.audioEngine.playEffect(this.sfxFGTrigger, false);
        }

        const lastIdx = scatterNodes.length - 1;
        scatterNodes.forEach((node, idx) => {
            cc.Tween.stopAllByTarget(node);
            node.angle = 0;

            const t = cc.tween(node)
                .to(1.5, { angle: 720 }, { easing: 'cubicInOut' });

            if (idx === lastIdx) {
                t.call(() => {
                    this.ui.showFGCongratsLayout(1.5, () => {
                        this.enterFreeGame();
                    });
                })
                .delay(0.3)
                .call(() => {
                    this.ui.swapFreeGameBackground(true);
                    if (this.bgmFreeGame) {
                        cc.audioEngine.playMusic(this.bgmFreeGame, true);
                    }
                });
            }

            t.start();
        });
    }

    private enterFreeGame(): void {
        this.freeSpinsLeft = 8;
        this.freeGameTotalWin = 0;
        this.fgMultiplier = 2;

        if (this.pot) this.pot.setFreeGameMode(true);
        this.ui.updateSpinButton(this.freeSpinsLeft);
        this.ui.updateFGMultiplier(this.fgMultiplier);

        cc.log(`✅ 恭喜動畫播完，切換至 IDLE 並自動開始第一局`);
        this.delegate.onFreeGameEntered();
    }

    handleFGSpin(totalMultiplier: number, bet: number): void {
        this.currentBet = bet;

        if (totalMultiplier > 0) {
            this.freeGameTotalWin += totalMultiplier * bet;
        }

        const bottleNodes = this.reelManager.getSymbolNodesByID(SlotSymbolID.BOTTLE);
        let bottleDelay = 0;

        if (bottleNodes.length > 0) {
            cc.log(`🍾 發現 ${bottleNodes.length} 個空瓶！飛行動畫準備`);
            bottleNodes.forEach((node, idx) => {
                const worldPos = node.convertToWorldSpaceAR(cc.Vec2.ZERO);
                this.scheduler.scheduleOnce(() => {
                    if (this.sfxEmptyBottle) {
                        cc.audioEngine.playEffect(this.sfxEmptyBottle, false);
                    }
                    this.ui.playBottleFlyAnimation(worldPos, () => {
                        this.fgMultiplier++;
                        this.ui.updateFGMultiplier(this.fgMultiplier);
                        cc.log(`📈 瓶子到達！當前倍數: x${this.fgMultiplier}`);
                    });
                }, idx * 0.4);
            });
            bottleDelay = bottleNodes.length * 0.4 + 0.6;
        }

        this.freeSpinsLeft--;
        this.ui.updateSpinButton(this.freeSpinsLeft);

        let delayTime = 1.0;
        if (totalMultiplier > 0) {
            delayTime = totalMultiplier >= BIG_WIN_THRESHOLD ? 2.5 : 1.6;
        }

        const waitTime = Math.max(delayTime, bottleDelay);

        if (this.freeSpinsLeft > 0) {
            this.scheduler.scheduleOnce(() => {
                this.delegate.onFGNextSpin();
            }, waitTime);
        } else {
            this.scheduler.scheduleOnce(() => {
                this.processFreeGameEnd();
            }, waitTime + 1.0);
        }
    }

    private processFreeGameEnd(): void {
        cc.log(`🏆 Free Game 結束！原始得分: ${this.freeGameTotalWin}, 最終乘數: x${this.fgMultiplier}`);

        const finalWinAmount = this.freeGameTotalWin * this.fgMultiplier;
        const totalFinalMulti = this.currentBet > 0 ? finalWinAmount / this.currentBet : 0;

        cc.log(`💵 最終大獎金額: ${finalWinAmount} (總倍率: ${totalFinalMulti}x)`);

        if (finalWinAmount > 0) {
            const extraWin = this.freeGameTotalWin * (this.fgMultiplier - 1);
            this.delegate.onFGBonusWin(extraWin);

            this.ui.showFGTotalWinLayout(finalWinAmount, this.fgMultiplier, 2.0, () => {
                cc.audioEngine.stopMusic();

                if (totalFinalMulti >= BIG_WIN_THRESHOLD) {
                    this.bigWin.showBigWin(finalWinAmount, totalFinalMulti, () => {
                        this.exitFreeGame();
                    });
                } else {
                    this.exitFreeGame();
                }
            });
        } else {
            this.exitFreeGame();
        }
    }

    private exitFreeGame(): void {
        if (this.pot) this.pot.setFreeGameMode(false);

        this.ui.playMagicTransition(false, () => {
            if (this.pot) this.pot.playIdle();
            if (this.bgmNormal) {
                cc.audioEngine.playMusic(this.bgmNormal, true);
            }
            this.delegate.onFreeGameExited();
        }, () => {
            this.ui.clearWinAmount();
            this.reelManager.stopAllWinAnimations();
        });
    }
}
