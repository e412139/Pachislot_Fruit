// SlotPotCtrl.ts
// Alchemy Slot — 煉金鍋（Pot）裝飾動畫控制器
// 掛載位置：node_Pot
// Inspector 連結：potSprite (cc.Node), glowSprite (cc.Node), bubbleParticle (cc.ParticleSystem)
//
// 節點建議結構：
//   node_Pot
//     ├── sprite_Pot       （鍋子主圖 Sprite）
//     ├── sprite_PotGlow   （發光疊圖 Sprite，初始 opacity=0）
//     └── particle_Bubble  （冒泡粒子 ParticleSystem，初始 stop）

const { ccclass, property } = cc._decorator;

@ccclass
export default class SlotPotCtrl extends cc.Component {

    @property(cc.Node)
    potSprite: cc.Node = null;

    @property(cc.Node)
    glowSprite: cc.Node = null;

    @property(cc.ParticleSystem)
    bubbleParticle: cc.ParticleSystem = null;

    private idleBaseY: number = 0;

    // ─── 生命週期 ────────────────────────────────────────────

    onLoad() {
        if (this.potSprite) {
            this.idleBaseY = this.potSprite.y;
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

        if (this.glowSprite) {
            cc.Tween.stopAllByTarget(this.glowSprite);
            this.glowSprite.opacity = 0;
        }
        if (this.bubbleParticle) this.bubbleParticle.stopSystem();

        this.potSprite.y     = this.idleBaseY;
        this.potSprite.scale = 1;

        cc.tween(this.potSprite)
            .repeatForever(
                cc.tween()
                    .to(1.5, { y: this.idleBaseY + 5, scale: 1.03 }, { easing: 'sineInOut' })
                    .to(1.5, { y: this.idleBaseY - 5, scale: 0.97 }, { easing: 'sineInOut' })
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

        const baseRot = 0;
        cc.tween(this.potSprite)
            .to(0.10, { rotation: baseRot + 8 })
            .to(0.20, { rotation: baseRot - 8 })
            .to(0.20, { rotation: baseRot + 6 })
            .to(0.20, { rotation: baseRot - 6 })
            .to(0.15, { rotation: baseRot + 3 })
            .to(0.15, { rotation: baseRot })
            .call(() => {
                // 搖晃結束，恢復 Idle
                if (this.bubbleParticle) this.bubbleParticle.stopSystem();
                this.playIdle();
            })
            .start();
    }

    /**
     * 中獎動畫
     * @param isBigWin true = 大獎（強烈發光+持續粒子），false = 小獎（閃光+小彈跳）
     */
    playWin(isBigWin: boolean) {
        if (!this.potSprite) return;
        cc.Tween.stopAllByTarget(this.potSprite);
        if (this.glowSprite) cc.Tween.stopAllByTarget(this.glowSprite);

        if (isBigWin) {
            // ── BigWin：持續高亮 + 大幅彈跳 + bubble 持續噴發
            if (this.glowSprite) {
                this.glowSprite.opacity = 0;
                cc.tween(this.glowSprite)
                    .to(0.3, { opacity: 255 })
                    .start();
            }
            if (this.bubbleParticle) this.bubbleParticle.resetSystem();

            cc.tween(this.potSprite)
                .to(0.25, { scale: 1.3, y: this.idleBaseY + 10 }, { easing: 'backOut' })
                .to(0.35, { scale: 1.0, y: this.idleBaseY })
                .start();
            // BigWin 狀態持續到 stopAll() 被呼叫（下一局開始）

        } else {
            // ── 小獎：快速閃光 + 小彈跳，結束後回 Idle
            if (this.glowSprite) {
                this.glowSprite.opacity = 0;
                cc.tween(this.glowSprite)
                    .to(0.2, { opacity: 200 })
                    .to(0.35, { opacity: 0 })
                    .start();
            }
            if (this.bubbleParticle) {
                this.bubbleParticle.resetSystem();
                this.scheduleOnce(() => {
                    if (this.bubbleParticle) this.bubbleParticle.stopSystem();
                }, 0.8);
            }

            cc.tween(this.potSprite)
                .to(0.15, { scale: 1.15, y: this.idleBaseY + 5 }, { easing: 'backOut' })
                .to(0.25, { scale: 1.0, y: this.idleBaseY })
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
            this.potSprite.scale    = 1;
            this.potSprite.rotation = 0;
            this.potSprite.y        = this.idleBaseY;
        }
        if (this.glowSprite) {
            cc.Tween.stopAllByTarget(this.glowSprite);
            this.glowSprite.opacity = 0;
        }
        if (this.bubbleParticle) {
            this.bubbleParticle.stopSystem();
        }
    }
}
