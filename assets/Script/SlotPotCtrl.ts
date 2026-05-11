// SlotPotCtrl.ts
// Alchemy Slot — 煉金鍋（Pot）裝飾動畫控制器
// 掛載位置：node_Pot
// Inspector 連結：
//   potSprite          (cc.Node)
//   smokeSprite        (cc.Node，初始 opacity=0)
//   bubbleParticleNormal (cc.ParticleSystem，一般模式粒子，綠色)
//   bubbleParticleFG     (cc.ParticleSystem，免費遊戲模式粒子，粉紫色)
//
// 節點建議結構：
//   node_Pot
//     ├── sprite_Pot
//     ├── sprite_smoke
//     ├── particle_BubbleNormal
//     └── particle_BubbleFG

const { ccclass, property } = cc._decorator;

@ccclass
export default class SlotPotCtrl extends cc.Component {

    @property(cc.Node)
    potSprite: cc.Node = null;

    @property(cc.Node)
    smokeSprite: cc.Node = null;

    @property(cc.ParticleSystem)
    bubbleParticleNormal: cc.ParticleSystem = null; // 一般模式（綠色）

    @property(cc.ParticleSystem)
    bubbleParticleFG: cc.ParticleSystem = null;     // 免費遊戲（粉紫色）

    private idleBaseY: number = 0;
    private smokeBaseY: number = 0;
    private smokeBaseScale: number = 1;
    private particleBaseScale: number = 1;
    private _isFreeGame: boolean = false;

    // 當前模式使用的粒子，讓各動畫方法不需要判斷模式
    private get _activeBubble(): cc.ParticleSystem {
        return this._isFreeGame ? this.bubbleParticleFG : this.bubbleParticleNormal;
    }

    // 當前模式不使用的粒子（需要被停掉）
    private get _inactiveBubble(): cc.ParticleSystem {
        return this._isFreeGame ? this.bubbleParticleNormal : this.bubbleParticleFG;
    }

    // ─── 生命週期 ────────────────────────────────────────────

    onLoad() {
        if (this.potSprite) {
            this.idleBaseY = this.potSprite.y;
        }
        if (this.smokeSprite) {
            this.smokeBaseY = this.smokeSprite.y;
            this.smokeBaseScale = this.smokeSprite.scale;
        }
        if (this.bubbleParticleNormal) {
            this.particleBaseScale = this.bubbleParticleNormal.node.scale;
        }
        this.stopAll();
    }

    start() {
        this.playIdle();
    }

    // ─── 公開介面 ────────────────────────────────────────────

    /**
     * 切換粒子模式（進出 Free Game 時呼叫）
     * @param isFreeGame true = 免費遊戲粒子（粉紫），false = 一般粒子（綠色）
     */
    setFreeGameMode(isFreeGame: boolean) {
        this._isFreeGame = isFreeGame;
        // node.active = false 讓殘留粒子立即消失，不等 lifetime 自然結束
        const inactive = this._inactiveBubble;
        if (inactive) {
            cc.Tween.stopAllByTarget(inactive.node);
            inactive.stopSystem();
            inactive.node.scale = this.particleBaseScale;
            inactive.node.active = false;
        }
    }

    /**
     * 待機動畫：呼吸縮放 0.97~1.03 + 粒子低頻呼吸
     * 無限循環，直到 stopAll() 呼叫
     */
    playIdle() {
        if (!this.potSprite) return;
        cc.Tween.stopAllByTarget(this.potSprite);

        if (this.smokeSprite) {
            cc.Tween.stopAllByTarget(this.smokeSprite);
            this.smokeSprite.opacity = 0;
        }

        // 非使用中的粒子立即隱藏
        const inactive = this._inactiveBubble;
        if (inactive) {
            cc.Tween.stopAllByTarget(inactive.node);
            inactive.stopSystem();
            inactive.node.active = false;
        }

        const bubble = this._activeBubble;
        if (bubble) {
            bubble.node.active = true;
            cc.Tween.stopAllByTarget(bubble.node);
            bubble.resetSystem();
            bubble.emissionRate = 10;

            cc.tween(bubble.node)
                .repeatForever(
                    cc.tween()
                        .to(2.0, { scale: this.particleBaseScale * 1.1 }, { easing: 'sineInOut' })
                        .to(2.0, { scale: this.particleBaseScale * 0.9 }, { easing: 'sineInOut' })
                )
                .start();
        }

        cc.tween(this.potSprite)
            .repeatForever(
                cc.tween()
                    .to(1.5, { scale: 1.03 }, { easing: 'sineInOut' })
                    .to(1.5, { scale: 0.97 }, { easing: 'sineInOut' })
            )
            .start();
    }

    /**
     * 旋轉動畫：快速縮放跳動 + 粒子加速，結束後自動回 Idle
     */
    playSpin() {
        if (!this.potSprite) return;
        cc.Tween.stopAllByTarget(this.potSprite);

        const bubble = this._activeBubble;
        if (bubble) {
            bubble.node.active = true;
            cc.Tween.stopAllByTarget(bubble.node);
            bubble.resetSystem();
            bubble.emissionRate = 50;

            cc.tween(bubble.node)
                .to(0.5, { scale: this.particleBaseScale * 1.3 })
                .start();
        }

        cc.tween(this.potSprite)
            .to(0.15, { scale: 1.2 })
            .to(0.15, { scale: 0.9 })
            .to(0.15, { scale: 1.1 })
            .to(0.15, { scale: 1.0 })
            .call(() => { this.playIdle(); })
            .start();
    }

    /**
     * 中獎動畫
     * @param isBigWin true = 大獎（強烈冒煙+持續粒子），false = 小獎（閃光+小彈跳）
     */
    playWin(isBigWin: boolean) {
        if (!this.potSprite) return;
        cc.Tween.stopAllByTarget(this.potSprite);
        if (this.smokeSprite) cc.Tween.stopAllByTarget(this.smokeSprite);

        const bubble = this._activeBubble;

        if (isBigWin) {
            if (this.smokeSprite) {
                this.smokeSprite.opacity = 0;
                this.smokeSprite.y = this.smokeBaseY;
                this.smokeSprite.scale = this.smokeBaseScale;

                cc.tween(this.smokeSprite)
                    .repeatForever(
                        cc.tween()
                            .set({ opacity: 0, scale: this.smokeBaseScale })
                            .parallel(
                                cc.tween().to(0.5, { opacity: 255 }).delay(1.0).to(1.0, { opacity: 0 }),
                                cc.tween().to(2.5, { scale: this.smokeBaseScale * 1.1 })
                            )
                    )
                    .start();
            }

            if (bubble) {
                bubble.node.active = true;
                cc.Tween.stopAllByTarget(bubble.node);
                bubble.resetSystem();
                bubble.emissionRate = 120;

                cc.tween(bubble.node)
                    .to(0.2, { scale: this.particleBaseScale * 1.5 }, { easing: 'backOut' })
                    .delay(2.0)
                    .to(0.5, { scale: this.particleBaseScale })
                    .start();
            }

            cc.tween(this.potSprite)
                .to(0.25, { scale: 1.3 }, { easing: 'backOut' })
                .to(0.35, { scale: 1.0 })
                .start();

        } else {
            if (this.smokeSprite) {
                this.smokeSprite.opacity = 0;
                this.smokeSprite.y = this.smokeBaseY;
                this.smokeSprite.scale = this.smokeBaseScale;

                cc.tween(this.smokeSprite)
                    .parallel(
                        cc.tween().to(0.2, { opacity: 200 }).delay(0.2).to(0.4, { opacity: 0 }),
                        cc.tween().to(0.8, { scale: this.smokeBaseScale * 1.05 })
                    )
                    .start();
            }

            if (bubble) {
                bubble.node.active = true;
                bubble.resetSystem();
                this.scheduleOnce(() => {
                    if (bubble) bubble.stopSystem();
                }, 0.8);
            }

            cc.tween(this.potSprite)
                .to(0.15, { scale: 1.15 }, { easing: 'backOut' })
                .to(0.25, { scale: 1.0 })
                .call(() => { this.playIdle(); })
                .start();
        }
    }

    /**
     * 停止所有動畫（通常在新一局開始時呼叫），不自動回 Idle
     */
    stopAll() {
        if (this.potSprite) {
            cc.Tween.stopAllByTarget(this.potSprite);
            this.potSprite.scale = 1;
            this.potSprite.angle = 0;
            this.potSprite.y = this.idleBaseY;
        }
        if (this.smokeSprite) {
            cc.Tween.stopAllByTarget(this.smokeSprite);
            this.smokeSprite.opacity = 0;
        }
        if (this.bubbleParticleNormal) {
            this.bubbleParticleNormal.stopSystem();
            this.bubbleParticleNormal.node.active = false;
        }
        if (this.bubbleParticleFG) {
            this.bubbleParticleFG.stopSystem();
            this.bubbleParticleFG.node.active = false;
        }
    }

    onDestroy() {
        this.unscheduleAllCallbacks();
        if (this.potSprite) cc.Tween.stopAllByTarget(this.potSprite);
        if (this.smokeSprite) cc.Tween.stopAllByTarget(this.smokeSprite);
        if (this.bubbleParticleNormal) cc.Tween.stopAllByTarget(this.bubbleParticleNormal.node);
        if (this.bubbleParticleFG) cc.Tween.stopAllByTarget(this.bubbleParticleFG.node);
    }
}
