// SlotInputHandler.ts
// 觸控輸入：短按旋轉、長按展開 AutoSpin 選單

import SlotUICtrl from "./SlotUICtrl";
import { SlotGamePhase } from "./SlotGameState";
import { IScheduler, IInputDelegate } from "./SlotInterfaces";

export default class SlotInputHandler {
    private isLongPress: boolean = false;
    private readonly boundTriggerLongPress: () => void;

    constructor(
        private spinParticle: cc.ParticleSystem,
        private ui: SlotUICtrl,
        private scheduler: IScheduler,
        private getPhase: () => SlotGamePhase,
        private getIsFreeGame: () => boolean,
        private delegate: IInputDelegate
    ) {
        this.boundTriggerLongPress = this.triggerLongPress.bind(this);
    }

    onTouchStart(): void {
        cc.log("🖱️ 按下去啦！(TOUCH_START) 目前 Phase=", SlotGamePhase[this.getPhase()]);
        if (this.getIsFreeGame()) return;
        if (this.getPhase() !== SlotGamePhase.IDLE) return;
        this.isLongPress = false;
        this.scheduler.scheduleOnce(this.boundTriggerLongPress, 0.5);
    }

    onTouchEnd(): void {
        cc.log("🖱️ 放開啦！(TOUCH_END) 是否為長按？", this.isLongPress);
        this.scheduler.unschedule(this.boundTriggerLongPress);
        if (this.spinParticle) this.spinParticle.stopSystem();
        if (this.getIsFreeGame()) return;
        if (this.getPhase() !== SlotGamePhase.IDLE) return;
        if (!this.isLongPress) {
            this.delegate.onSpinRequested();
        }
    }

    onTouchCancel(): void {
        cc.log("🖱️ 觸控取消！(TOUCH_CANCEL)");
        this.scheduler.unschedule(this.boundTriggerLongPress);
        if (this.spinParticle) this.spinParticle.stopSystem();
    }

    private triggerLongPress(): void {
        this.isLongPress = true;
        cc.log("👉 長按：展開 Auto Spin 選單");
        if (this.spinParticle) this.spinParticle.resetSystem();
        this.ui.showAutoSpinMenu();
    }
}
