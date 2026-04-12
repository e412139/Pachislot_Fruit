// SlotPotCtrl.ts
// Alchemy Slot — 煉金鍋（Pot）裝飾動畫控制器
// 掛載位置：node_Pot
// Inspector 連結：potSprite (cc.Node), smokeSprite (cc.Node), bubbleParticle (cc.ParticleSystem)
//
// 節點建議結構：
//   node_Pot
//     ├── sprite_Pot       （鍋子主圖 Sprite）
//     ├── sprite_smoke   （冒煙圖 Sprite，初始 opacity=0）
//     └── particle_Bubble  （冒泡粒子 ParticleSystem，初始 stop）

const { ccclass, property } = cc._decorator;

@ccclass
export default class SlotPotCtrl extends cc.Component {

    @property(cc.Node)
    potSprite: cc.Node = null;

    @property(cc.Node)
    smokeSprite: cc.Node = null;

    @property(cc.ParticleSystem)
    bubbleParticle: cc.ParticleSystem = null;

    private idleBaseY: number = 0;
    private smokeBaseY: number = 0;
    private smokeBaseScale: number = 1; 
    private particleBaseScale: number = 1; // 儲存粒子節點的原始大小基準

    // ─── 生命週期 ────────────────────────────────────────────

    onLoad() {
        if (this.potSprite) {
            this.idleBaseY = this.potSprite.y;
        }
        if (this.smokeSprite) {
            this.smokeBaseY = this.smokeSprite.y;
            this.smokeBaseScale = this.smokeSprite.scale; 
        }
        if (this.bubbleParticle) {
            this.particleBaseScale = this.bubbleParticle.node.scale;
        }
        this.stopAll();
    }

    start() {
        this.playIdle();
    }

    // ─── 公開介面 ────────────────────────────────────────────

    /**
     * 待機動畫：上下浮動 ±5px + 呼吸縮放 0.97~1.03
     * 無限循環，直到 stopAll() 呼叫
     */
    playIdle() {
        if (!this.potSprite) return;
        cc.Tween.stopAllByTarget(this.potSprite);

        if (this.smokeSprite) {
            cc.Tween.stopAllByTarget(this.smokeSprite);
            this.smokeSprite.opacity = 0;
        }
        if (this.bubbleParticle) this.bubbleParticle.stopSystem();

        // 讓亮光粒子在待機時也維持低頻率呼吸
        if (this.bubbleParticle) {
            cc.Tween.stopAllByTarget(this.bubbleParticle.node);
            this.bubbleParticle.resetSystem(); // 保持粒子排放
            // 降低排放量，讓它看起來比較柔和
            this.bubbleParticle.emissionRate = 10; 
            
            cc.tween(this.bubbleParticle.node)
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
     * 旋轉動畫：鍋子左右搖晃 + 冒泡粒子加速
     * 搖晃結束後自動回到 Idle
     */
    playSpin() {
        if (!this.potSprite) return;
        cc.Tween.stopAllByTarget(this.potSprite);

        if (this.bubbleParticle) this.bubbleParticle.resetSystem();

        // 旋轉亮光強化
        if (this.bubbleParticle) {
            cc.Tween.stopAllByTarget(this.bubbleParticle.node);
            this.bubbleParticle.resetSystem();
            this.bubbleParticle.emissionRate = 50; // 提升排放量
            
            cc.tween(this.bubbleParticle.node)
                .to(0.5, { scale: this.particleBaseScale * 1.3 })
                .start();
        }

        // 改為快速縮放跳動，不要左右搖晃
        cc.tween(this.potSprite)
            .to(0.15, { scale: 1.2 })
            .to(0.15, { scale: 0.9 })
            .to(0.15, { scale: 1.1 })
            .to(0.15, { scale: 1.0 })
            .call(() => {
                // 恢復待機
                this.playIdle();
            })
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

        if (isBigWin) {
            // ── BigWin：持續高亮冒煙 (純放大與淡入淡出) + 大幅彈跳 + bubble 持續噴發
            if (this.smokeSprite) {
                cc.Tween.stopAllByTarget(this.smokeSprite);
                this.smokeSprite.opacity = 0;
                this.smokeSprite.y = this.smokeBaseY;
                this.smokeSprite.scale = this.smokeBaseScale;

                // 煙霧動態效果：透明度漸現、僅以你的 Inspector 設定為基準做微幅呼吸感
                cc.tween(this.smokeSprite)
                    .repeatForever(
                        cc.tween()
                            .set({ opacity: 0, scale: this.smokeBaseScale })
                            .parallel(
                                cc.tween().to(0.5, { opacity: 255 }).delay(1.0).to(1.0, { opacity: 0 }),
                                // 在原始大小基礎上稍微變動即可
                                cc.tween().to(2.5, { scale: this.smokeBaseScale * 1.1 })
                            )
                    )
                    .start();
            }
            // 亮光爆發演出！
            if (this.bubbleParticle) {
                cc.Tween.stopAllByTarget(this.bubbleParticle.node);
                this.bubbleParticle.resetSystem();
                this.bubbleParticle.emissionRate = 120; // 大幅噴發
                
                cc.tween(this.bubbleParticle.node)
                    .to(0.2, { scale: this.particleBaseScale * 1.5 }, { easing: 'backOut' })
                    .delay(2.0)
                    .to(0.5, { scale: this.particleBaseScale })
                    .start();
            }

            cc.tween(this.potSprite)
                .to(0.25, { scale: 1.3 }, { easing: 'backOut' })
                .to(0.35, { scale: 1.0 })
                .start();
            // BigWin 狀態持續到 stopAll() 被呼叫（下一局開始）

        } else {
            // ── 小獎：原地快速冒煙飄散 + 小彈跳，結束後回 Idle
            if (this.smokeSprite) {
                cc.Tween.stopAllByTarget(this.smokeSprite);
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
            if (this.bubbleParticle) {
                this.bubbleParticle.resetSystem();
                this.scheduleOnce(() => {
                    if (this.bubbleParticle) this.bubbleParticle.stopSystem();
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
        if (this.bubbleParticle) {
            this.bubbleParticle.stopSystem();
        }
    }

    onDestroy() {
        this.unscheduleAllCallbacks();
        if (this.potSprite) cc.Tween.stopAllByTarget(this.potSprite);
        if (this.smokeSprite) cc.Tween.stopAllByTarget(this.smokeSprite);
        if (this.bubbleParticle) cc.Tween.stopAllByTarget(this.bubbleParticle.node);
    }
}
