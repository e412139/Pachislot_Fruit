// SlotReelManager.ts
// Alchemy Slot — 管理 5 個滾輪
// 掛載位置：node_SlotGame（主節點）
// Inspector 連結：
//   symbolPrefab — 只需設定一次，會自動分發給全部 Reel
//   reels[]      — 依序拖入 5 個 node_SlotReel_*

import { SlotSymbolID } from "./SlotSymbolDef";
import SlotReelCtrl from "./SlotReelCtrl";

const { ccclass, property } = cc._decorator;

// 各滾輪停輪延遲（秒）：業界標準做法
const REEL_STOP_DELAYS = [0.0, 0.2, 0.4, 0.6, 0.8];

@ccclass
export default class SlotReelManager extends cc.Component {

    /** Symbol Prefab：只需設定一次，會自動套用到全部 5 個 Reel */
    @property(cc.Prefab)
    symbolPrefab: cc.Prefab = null;

    @property([SlotReelCtrl])
    reels: SlotReelCtrl[] = [];

    // ─── 生命週期 ────────────────────────────────────────────

    onLoad() {
        // 將 symbolPrefab 分發給每個 Reel，再讓它們各自初始化
        if (!this.symbolPrefab) {
            cc.error("❌ SlotReelManager: symbolPrefab 未設定！請在 Inspector 拖入 SlotSymbolPrefab");
            return;
        }
        this.reels.forEach((reel, i) => {
            if (reel) {
                reel.symbolPrefab = this.symbolPrefab;
                reel.initSymbols();
                cc.log(`✅ Reel ${i} 初始化完成`);
            } else {
                cc.warn(`⚠️ Reel ${i} 未連結，請檢查 SlotReelManager 的 reels 陣列`);
            }
        });
    }

    // ─── 公開介面 ────────────────────────────────────────────

    /** 所有滾輪同時開始旋轉 */
    spinAll() {
        this.reels.forEach(r => r.spin());
    }

    /**
     * 依序延遲停輪，全部停止後呼叫 onAllStopped
     * @param matrix matrix[col][row]，5 cols × 4 rows
     * @param onAllStopped 全部停輪後的 callback
     */
    stopAll(matrix: SlotSymbolID[][], onAllStopped: () => void) {
        let stoppedCount = 0;
        const total = this.reels.length;

        this.reels.forEach((reel, i) => {
            const delay = REEL_STOP_DELAYS[i] ?? 0;
            this.scheduleOnce(() => {
                reel.stop(matrix[i], () => {
                    stoppedCount++;
                    cc.log(`🛑 Reel ${i} 停止（${stoppedCount}/${total}）`);
                    if (stoppedCount >= total) {
                        cc.log("💯 所有滾輪已停止");
                        onAllStopped();
                    }
                });
            }, delay);
        });
    }

    /**
     * 播放中獎格閃爍動畫
     * @param positions 中獎格座標陣列 { col, row }
     */
    playWinAnimations(positions: { col: number; row: number }[]) {
        for (const pos of positions) {
            const reel = this.reels[pos.col];
            if (reel) reel.playWinAnimation(pos.row);
        }
    }

    /** 停止所有中獎動畫，還原到正常狀態 */
    stopAllWinAnimations() {
        this.reels.forEach(r => r.stopAllWinAnims());
    }
}
