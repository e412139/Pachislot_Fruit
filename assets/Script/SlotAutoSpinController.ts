// SlotAutoSpinController.ts
// AutoSpin 邏輯：局數管理、按鈕綁定、間隔排程

import SlotUICtrl from "./SlotUICtrl";
import { IScheduler, IAutoSpinDelegate } from "./SlotInterfaces";

const BIG_WIN_THRESHOLD = 50;

export default class SlotAutoSpinController {
    public count: number = 0;

    constructor(
        private ui: SlotUICtrl,
        private toggleSpeed: cc.Toggle,
        private scheduler: IScheduler,
        private canSpin: () => boolean,
        private delegate: IAutoSpinDelegate
    ) {}

    handleAutoSpin(totalMultiplier: number): void {
        cc.log(`🔄 [AutoSpin] 進入 handleAutoSpin, 目前剩餘局數: ${this.count}`);

        if (this.count === 0) {
            cc.log(`🛑 [AutoSpin] 局數為 0，停止自動轉`);
            return;
        }

        if (this.count > 0) {
            this.count--;
            this.ui.updateSpinButton(this.count);
            cc.log(`🔄 [AutoSpin] 扣除一次, 剩下: ${this.count}`);
        }

        const isQuickSpin = this.toggleSpeed ? this.toggleSpeed.isChecked : false;

        let delay = 1.0;
        if (totalMultiplier > 0) {
            delay = totalMultiplier >= BIG_WIN_THRESHOLD ? 3.0 : (isQuickSpin ? 0.6 : 1.6);
        } else {
            delay = isQuickSpin ? 0.3 : 1.0;
        }

        cc.log(`⏳ [AutoSpin] 準備等待 ${delay} 秒後觸發下一次 onSpinClick`);

        this.scheduler.scheduleOnce(() => {
            cc.log(`⏰ [AutoSpin] 延遲結束！count = ${this.count}`);
            if (this.canSpin() && this.count !== 0) {
                cc.log(`🚀 [AutoSpin] 條件符合，執行 onAutoSpinTick()`);
                this.delegate.onAutoSpinTick();
            } else {
                cc.log(`❌ [AutoSpin] 條件不符！無法自動轉`);
            }
        }, delay);
    }

    onAutoSpinSelected(count: number): void {
        cc.log(`✅ [Debug] 成功觸發 AutoSpin：${count} 局`);
        this.count = count;
        this.ui.hideAutoSpinMenu();
        this.ui.updateSpinButton(count);
        cc.log(`⚙️ Auto Spin 設定：${count === -1 ? "無限" : count} 局`);
        this.delegate.onAutoSpinTick();
    }

    reset(): void {
        this.count = 0;
        this.ui.updateSpinButton(0);
    }

    bindButtons(menuNode: cc.Node): void {
        if (!menuNode) return;

        const buttons = [
            { name: "btn_20",  count: 20  },
            { name: "btn_50",  count: 50  },
            { name: "btn_100", count: 100 },
            { name: "btn_250", count: 250 },
            { name: "btn_loop", count: -1 }
        ];

        buttons.forEach(b => {
            const btnNode = menuNode.getChildByName(b.name);
            if (btnNode) {
                btnNode.on(cc.Node.EventType.TOUCH_END, (e: cc.Event.EventTouch) => {
                    e.stopPropagation();
                    this.onAutoSpinSelected(b.count);
                }, this);

                const bg = btnNode.getChildByName("Background");
                if (bg) {
                    bg.on(cc.Node.EventType.TOUCH_END, (e: cc.Event.EventTouch) => {
                        e.stopPropagation();
                        this.onAutoSpinSelected(b.count);
                    }, this);
                }
            }
        });
    }
}
