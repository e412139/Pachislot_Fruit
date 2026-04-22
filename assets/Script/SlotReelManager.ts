// SlotReelManager.ts
// Alchemy Slot — 管理 5 個滾輪
// 掛載位置：node_SlotGame（主節點）
// Inspector 連結：
//   symbolPrefab — 只需設定一次，會自動分發給全部 Reel
//   reels[]      — 依序拖入 5 個 node_SlotReel_*

import { SlotSymbolID } from "./SlotSymbolDef";
import SlotReelCtrl from "./SlotReelCtrl";
import SlotMagicDoorCtrl from "./SlotMagicDoorCtrl";

const { ccclass, property } = cc._decorator;

// 各滾輪停輪延遲（秒）：改為內部變數管理

@ccclass
export default class SlotReelManager extends cc.Component {

    @property(cc.Prefab)
    symbolPrefab: cc.Prefab = null;

    @property(cc.Prefab)
    magicDoorPrefab: cc.Prefab = null;

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
                reel.magicDoorPrefab = this.magicDoorPrefab; // 補上這個傳遞！
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

    /**
     * 播放魔法門擴展動畫
     * @param colIndices 觸發的輪數 (例如 [0, 3, 4])
     * @param luckySymbol 揭曉的幸運圖標
     * @param matrix 被改寫的盤面
     * @param onComplete 全部開門動畫完畢後呼叫
     */
    playMagicDoorExpansion(colIndices: number[], luckySymbol: SlotSymbolID, matrix: SlotSymbolID[][], onComplete: () => void) {
        if (!this.magicDoorPrefab) {
            cc.warn("⚠️ magicDoorPrefab 未設定，直接強制替換圖標");
            colIndices.forEach(c => {
                for (let r = 0; r < 4; r++) matrix[c][r] = luckySymbol;
                this.reels[c].forceUpdateAllSymbols(luckySymbol);
            });
            onComplete();
            return;
        }

        let completedCount = 0;

        colIndices.forEach((col, idx) => {
            const reel = this.reels[col];

            // 更新算獎用的盤面陣列庫
            for (let r = 0; r < 4; r++) matrix[col][r] = luckySymbol;

            if (reel) {
                // ★ 直接取用 SlotReelCtrl 在 stop() 時已生成並隨輪滾入的巨型門
                const doorNode = reel.giantDoorNode;
                if (!doorNode || !cc.isValid(doorNode)) {
                    cc.warn(`⚠️ 輪 ${col} 找不到 giantDoorNode，直接替換圖標`);
                    reel.forceUpdateAllSymbols(luckySymbol);
                    completedCount++;
                    if (completedCount === colIndices.length) onComplete();
                    return;
                }

                // 確保此時門已在 reel.node 層
                // （SlotReelCtrl 的 stop() 已把門掛在 this.node = reel.node）
                let doorCtrl = doorNode.getComponent(SlotMagicDoorCtrl);
                if (!doorCtrl) {
                    doorCtrl = doorNode.addComponent(SlotMagicDoorCtrl);
                }

                // 給一點起步延遲製造參差不齊感
                this.scheduleOnce(() => {
                    // ★ 玩家強烈要求：在移動對齊動畫的瞬間，底下被波及的 4 個格子全都瞬間隱藏，
                    // 以免半透明門滑動時看到原本的小圖標交錯！
                    reel.forceSetAllHidden(true);

                    // 目標對齊高度：0（轉輪正中央）
                    doorCtrl.playAlignAndOpen(0, () => {
                        // 大門全開後，底下圖標替換 (並在此方法內解除隱藏)
                        reel.forceUpdateAllSymbols(luckySymbol);
                        // 銷毀門節點（圖標已顯示）
                        if (cc.isValid(doorNode)) doorNode.destroy();
                        reel.giantDoorNode = null;
                        completedCount++;
                        if (completedCount === colIndices.length) {
                            // ★ 玩家要求：在所有門都開完、圖標都換好後，多留 0.5 秒給玩家看清楚開獎結果
                            this.scheduleOnce(() => {
                                onComplete();
                            }, 0.5);
                        }
                    });
                }, idx * 0.1);
            }
        });
    }
}
