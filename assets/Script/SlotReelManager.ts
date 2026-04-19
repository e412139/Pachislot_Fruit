// SlotReelManager.ts
// Alchemy Slot — 管理 5 個滾輪
// 掛載位置：node_SlotGame（主節點）
// Inspector 連結：
//   symbolPrefab — 只需設定一次，會自動分發給全部 Reel
//   reels[]      — 依序拖入 5 個 node_SlotReel_*

import { SlotSymbolID } from "./SlotSymbolDef";
import SlotReelCtrl from "./SlotReelCtrl";

const { ccclass, property } = cc._decorator;

// 各滾輪停輪延遲（秒）：改為內部變數管理

@ccclass
export default class SlotReelManager extends cc.Component {

    /** Symbol Prefab：只需設定一次，會自動套用到全部 5 個 Reel */
    @property(cc.Prefab)
    symbolPrefab: cc.Prefab = null;

    @property([SlotReelCtrl])
    reels: SlotReelCtrl[] = [];

    @property(cc.AudioClip)
    reelStopAudio: cc.AudioClip = null;

    private isQuickSpin: boolean = false;
    private normalStopDelays = [0.0, 0.2, 0.4, 0.6, 0.8];
    private quickStopDelays = [0.0, 0.0, 0.0, 0.0, 0.0]; // 快速轉輪時不等待，同時發出停輪指令

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

    /** 
     * 設定快速旋轉模式狀態，並將速度參數派發給所有 Reel 
     */
    setQuickSpinMode(isQuick: boolean) {
        this.isQuickSpin = isQuick;
        this.reels.forEach(r => {
            if (r) {
                // 快速: 3500px/s, 一般: 1500px/s
                r.setSpeed(isQuick ? 3500 : 1500);
            }
        });
    }

    /** 所以滾輪同時開始旋轉 */
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
        const delays = this.isQuickSpin ? this.quickStopDelays : this.normalStopDelays;
        let hasPlayedQuickSound = false;

        this.reels.forEach((reel, i) => {
            const delay = delays[i] ?? 0;
            this.scheduleOnce(() => {
                reel.stop(matrix[i], () => {
                    stoppedCount++;
                    
                    // --- 播放停止音效機制 ---
                    if (this.reelStopAudio) {
                        if (this.isQuickSpin) {
                           if (!hasPlayedQuickSound) {
                               cc.audioEngine.playEffect(this.reelStopAudio, false);
                               hasPlayedQuickSound = true;
                           }
                        } else {
                           cc.audioEngine.playEffect(this.reelStopAudio, false);
                        }
                    }

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

    /** 根據 SymbolID 取得盤面上所有符合的實體節點 (cc.Node) */
    getSymbolNodesByID(id: SlotSymbolID): cc.Node[] {
        const nodes: cc.Node[] = [];
        this.reels.forEach(r => {
            if (r) {
                nodes.push(...r.getSymbolNodesByID(id));
            }
        });
        return nodes;
    }
}
