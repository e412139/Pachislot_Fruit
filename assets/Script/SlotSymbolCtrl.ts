// SlotSymbolCtrl.ts
// Alchemy Slot — 每個 Symbol Prefab 的根節點元件
// 掛載位置：SlotSymbolPrefab 根節點
// Inspector 連結：sprite (cc.Sprite), label (cc.Label, 可選), symbolFrames []

import { SlotSymbolID } from "./SlotSymbolDef";

const { ccclass, property } = cc._decorator;

@ccclass
export default class SlotSymbolCtrl extends cc.Component {

    @property(cc.Sprite)
    sprite: cc.Sprite = null;

    @property(cc.Label)
    label: cc.Label = null;

    /** 對應每個 SlotSymbolID 的 SpriteFrame（共 12 張，順序需與 enum 一致） */
    @property([cc.SpriteFrame])
    symbolFrames: cc.SpriteFrame[] = [];

    private currentID: SlotSymbolID = SlotSymbolID.S1;

    // ─── 公開介面 ────────────────────────────────────────────

    setSymbol(id: SlotSymbolID) {
        this.currentID = id;

        if (this.sprite && this.symbolFrames.length > id && this.symbolFrames[id]) {
            this.sprite.spriteFrame = this.symbolFrames[id];
        }

        if (this.label) {
            this.label.string = this.getSymbolName(id);
        }
    }

    getSymbol(): SlotSymbolID {
        return this.currentID;
    }

    /** 播放中獎閃爍動畫（scale 彈跳 + opacity 閃爍） */
    playWinAnim() {
        cc.Tween.stopAllByTarget(this.node);
        this.node.scale = 1;
        this.node.opacity = 255;

        cc.tween(this.node)
            .repeatForever(
                cc.tween()
                    .to(0.18, { scale: 1.1 }, { easing: 'backOut' })
                    .to(0.18, { scale: 1.0 })
                    .to(0.12, { opacity: 60 })
                    .to(0.12, { opacity: 255 })
            )
            .start();
    }

    /** 停止中獎動畫，還原到正常狀態 */
    stopWinAnim() {
        cc.Tween.stopAllByTarget(this.node);
        this.node.scale = 1;
        this.node.opacity = 255;
    }

    onDestroy() {
        cc.Tween.stopAllByTarget(this.node);
    }

    // ─── 私有工具 ────────────────────────────────────────────

    private getSymbolName(id: SlotSymbolID): string {
        const names = ['S1', 'S2', 'S3', 'S4', 'S5',
            'TEN', 'J', 'Q', 'K', 'A', 'WILD', '⭐', '空瓶'];
        return names[id] ?? '?';
    }
}
