// AudioService.ts
// 針對「game」場景的音訊服務 (符合 SOLID 原則：單一職責)
// 掛載位置：與 GameManager 相同的節點或其子節點

const { ccclass, property } = cc._decorator;

@ccclass
export default class AudioService extends cc.Component {

    @property(cc.AudioClip)
    bgmNormal: cc.AudioClip = null;

    @property(cc.AudioClip)
    bgmFreeGame: cc.AudioClip = null;

    @property(cc.AudioClip)
    sfxFGTrigger: cc.AudioClip = null;

    /** 播放一般模式背景音樂 (放鬆) */
    playNormalBGM() {
        if (!this.bgmNormal) return;
        cc.audioEngine.stopMusic();
        cc.audioEngine.playMusic(this.bgmNormal, true);
    }

    /** 播放 Free Game 模式背景音樂 (緊張) */
    playFreeGameBGM() {
        if (!this.bgmFreeGame) return;
        cc.audioEngine.stopMusic();
        cc.audioEngine.playMusic(this.bgmFreeGame, true);
    }

    /** 播放進入 Free Game 的觸發音效 (Fanfare) */
    playFGTrigger() {
        if (this.sfxFGTrigger) {
            cc.audioEngine.playEffect(this.sfxFGTrigger, false);
        }
    }

    /** 停止所有音樂 (場景切換或結算時用) */
    stopAll() {
        cc.audioEngine.stopAll();
    }
}
