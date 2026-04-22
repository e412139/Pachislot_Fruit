// SlotMagicDoorCtrl.ts
// 控制 100x400 的巨大神秘門 `node_magic_door.prefab`
// 掛載於 node_magic_door 根節點

const { ccclass, property } = cc._decorator;

@ccclass
export default class SlotMagicDoorCtrl extends cc.Component {

    @property(cc.Animation)
    doorAnim: cc.Animation = null; // 若有製作實體開門動畫可拉入

    @property(cc.AudioClip)
    doorSlamAudio: cc.AudioClip = null; // 門落下的撞擊聲

    @property(cc.AudioClip)
    doorOpenAudio: cc.AudioClip = null; // 開門聲

    onLoad() {
        // 初始確保縮放比例為 1
        this.node.scaleX = 1;
        this.node.scaleY = 1;
    }

    /**
     * 執行對齊與開門揭曉動畫
     * @param targetY 最終對齊的 Y 軸位置 (通常是 0)
     * @param onComplete 動畫結束後的回呼
     */
    playAlignAndOpen(targetY: number, onComplete: () => void) {
        // 第一階段：滑動對齊 (Tween Y)
        const distance = Math.abs(this.node.y - targetY);
        // 強制拉長動畫時間，讓玩家明確看到「門在往中間滑動對齊」的過程（保底 0.5 秒）
        const dropTime = distance < 10 ? 0.3 : Math.max(0.5, distance / 500);

        cc.tween(this.node)
            .to(dropTime, { y: targetY }, { easing: 'sineInOut' })
            .call(() => {
                // 對齊抵達時播放撞擊聲
                if (this.doorSlamAudio) cc.audioEngine.playEffect(this.doorSlamAudio, false);
            })
            // 停頓 0.3 秒，製造力量感
            .delay(0.3)
            .call(() => {
                // 第二階段：開門揭曉
                if (this.doorOpenAudio) cc.audioEngine.playEffect(this.doorOpenAudio, false);
                this.playOpenAnimation(onComplete);
            })
            .start();
    }

    private playOpenAnimation(onComplete: () => void) {
        let isCompleteFired = false;
        const safeComplete = () => {
            if (!isCompleteFired) {
                isCompleteFired = true;
                if (cc.isValid(this.node)) {
                    onComplete();
                    this.node.destroy();
                }
            }
        };

        if (this.doorAnim && this.doorAnim.getClips().length > 0) {
            // 如果有做 Animation 動畫，優先播放
            const clipName = this.doorAnim.getClips()[0].name;
            const animState = this.doorAnim.play(clipName);

            // 防呆 1：如果素材不小心設成循環 (Loop)，強制改為播放一次就停 (Normal)
            if (animState) {
                animState.wrapMode = cc.WrapMode.Normal;
            }

            // 防呆 2：萬一動畫系統吃掉事件，2 秒後強制開門
            this.scheduleOnce(safeComplete, 2.0);

            // 監聽動畫結束
            this.doorAnim.on('finished', safeComplete, this);
        } else {
            // 預設效果：利用 ScaleX 壓縮成 0 當作開門
            cc.tween(this.node)
                .to(0.3, { scaleX: 0 }, { easing: 'sineIn' })
                .call(safeComplete)
                .start();
        }
    }
}
