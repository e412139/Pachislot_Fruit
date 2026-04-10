// SlotGameCtrl.ts
// Alchemy Slot — 主控制器（5×4 / 243 Ways）
// 掛載位置：node_SlotGame（主節點）
//
// Inspector 連結一覽：
//   reelManager      — SlotReelManager 元件所在節點
//   ui               — SlotUICtrl 元件所在節點
//   pot              — SlotPotCtrl 元件所在節點（煉金鍋，可不連就跳過）
//   coinSpawner      — CoinSpawner 元件節點（可沿用現有）
//   btn_spinNode     — Spin 大按鈕節點（綁長按觸控事件）
//   spinParticle     — 長按噴發粒子（可沿用現有）
//   betButtonAudio   — 旋轉/下注按鈕音效
//   fireAudio        — 一般中獎音效
//   bigWinAudio      — 大獎重複播放音效

import { SlotGamePhase } from "./SlotGameState";
import { SlotSymbolID } from "./SlotSymbolDef";
import SlotRNG from "./SlotRNG";
import SlotMath from "./SlotMath";
import SlotReelManager from "./SlotReelManager";
import SlotUICtrl from "./SlotUICtrl";
import SlotPotCtrl from "./SlotPotCtrl";
import CoinSpawner from "./CoinSpawner";

const { ccclass, property } = cc._decorator;

/** 倍率 ≥ 此數值時觸發 BigWin 演出 */
const BIG_WIN_THRESHOLD = 10;

@ccclass
export default class SlotGameCtrl extends cc.Component {

    // ─── Inspector 屬性 ──────────────────────────────────────

    @property(SlotReelManager)
    reelManager: SlotReelManager = null;

    @property(SlotUICtrl)
    ui: SlotUICtrl = null;

    @property(SlotPotCtrl)
    pot: SlotPotCtrl = null;

    @property(CoinSpawner)
    coinSpawner: CoinSpawner = null;

    @property(cc.Node)
    btn_spinNode: cc.Node = null;

    @property(cc.ParticleSystem)
    spinParticle: cc.ParticleSystem = null;

    @property(cc.AudioClip)
    betButtonAudio: cc.AudioClip = null;

    @property(cc.AudioClip)
    fireAudio: cc.AudioClip = null;

    @property(cc.AudioClip)
    bigWinAudio: cc.AudioClip = null;

    // ─── 私有狀態 ────────────────────────────────────────────

    private phase: SlotGamePhase = SlotGamePhase.IDLE;
    private rng: SlotRNG = new SlotRNG();
    private spinMatrix: SlotSymbolID[][] = null;

    credit: number = 1000;
    bet: number = 10;

    private autoSpinCount: number = 0;   // -1 = 無限
    private isLongPress: boolean = false;
    private bigWinAudioID: number = -1;

    // ─── 生命週期 ────────────────────────────────────────────

    onLoad() {
        this.ui.updateScore(this.credit);
        this.ui.clearWinAmount();
        this.ui.hideBigWinLayer();
        this.ui.updateSpinButton(0);

        if (this.spinParticle) this.spinParticle.stopSystem();

        if (this.btn_spinNode) {
            // 拿掉 true，避免攔截到其他選單按鈕的事件！
            this.btn_spinNode.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.btn_spinNode.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.btn_spinNode.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        }

        // 強制由程式碼接管 Auto Spin 選單按鈕，無視編輯器的 Bug
        this.bindAutoSpinButtons();
    }

    onDestroy() {
        if (this.btn_spinNode) {
            this.btn_spinNode.off(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.btn_spinNode.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.btn_spinNode.off(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        }
    }

    // ─── 觸控 / 長按 ────────────────────────────────────────

    private onTouchStart() {
        cc.log("🖱️ 按下去啦！(TOUCH_START) 目前 Phase=", SlotGamePhase[this.phase]);
        if (this.phase !== SlotGamePhase.IDLE) return;
        this.isLongPress = false;
        this.scheduleOnce(this.triggerLongPress, 0.5);
    }

    private onTouchEnd() {
        cc.log("🖱️ 放開啦！(TOUCH_END) 是否為長按？", this.isLongPress);
        this.unschedule(this.triggerLongPress);
        if (this.spinParticle) this.spinParticle.stopSystem();
        if (this.phase !== SlotGamePhase.IDLE) return;
        if (!this.isLongPress) {
            // 短按：中止 auto spin 並執行一次正常旋轉
            this.autoSpinCount = 0;
            this.ui.updateSpinButton(0);
            this.onSpinClick();
        }
    }

    private onTouchCancel() {
        cc.log("🖱️ 觸控取消！(TOUCH_CANCEL)");
        this.unschedule(this.triggerLongPress);
        if (this.spinParticle) this.spinParticle.stopSystem();
    }

    private triggerLongPress() {
        this.isLongPress = true;
        cc.log("👉 長按：展開 Auto Spin 選單");
        if (this.spinParticle) this.spinParticle.resetSystem();
        this.ui.showAutoSpinMenu();
    }

    // ─── Auto Spin 選單按鈕程式綁定 ──────────────────────

    private bindAutoSpinButtons() {
        if (!this.ui || !this.ui.node_AutoSpinMenu) return;

        const menu = this.ui.node_AutoSpinMenu;
        const buttons = [
            { name: "btn_20", count: 20 },
            { name: "btn_50", count: 50 },
            { name: "btn_100", count: 100 },
            { name: "btn_250", count: 250 },
            { name: "btn_loop", count: -1 }
        ];

        buttons.forEach(b => {
            const btnNode = menu.getChildByName(b.name);
            if (btnNode) {
                // 綁定原生觸控，完全繞過 cc.Button 的層級問題
                btnNode.on(cc.Node.EventType.TOUCH_END, (e: cc.Event.EventTouch) => {
                    e.stopPropagation();
                    this.onAutoSpinSelected(null, b.count.toString());
                }, this);

                // 如果感應區跑位，我們連圖片 (Background) 都綁上，確保點得到圖就生效
                const bg = btnNode.getChildByName("Background");
                if (bg) {
                    bg.on(cc.Node.EventType.TOUCH_END, (e: cc.Event.EventTouch) => {
                        e.stopPropagation();
                        this.onAutoSpinSelected(null, b.count.toString());
                    }, this);
                }
            }
        });
    }

    /** 供場景中 Auto Spin 選單按鈕的 Click Events 呼叫 */
    onAutoSpinSelected(event: any, data: string) {
        cc.log(`✅ [Debug] 成功觸發 AutoSpin：${data} 局`);
        const count = parseInt(data);
        this.autoSpinCount = count;
        this.ui.hideAutoSpinMenu();
        this.ui.updateSpinButton(count);
        cc.log(`⚙️ Auto Spin 設定：${count === -1 ? "無限" : count} 局`);
        this.onSpinClick();
    }

    // ─── 主流程 ──────────────────────────────────────────────

    /** Spin 按鈕點擊入口（供短按、auto spin 共用） */
    onSpinClick() {
        if (this.phase !== SlotGamePhase.IDLE) return;

        this.ui.hideAutoSpinMenu();

        if (this.betButtonAudio) {
            cc.audioEngine.playEffect(this.betButtonAudio, false);
        }

        this.credit -= this.bet;
        this.ui.updateScore(this.credit);
        this.ui.clearWinAmount();
        this.ui.hideBigWinLayer();
        this.stopBigWinEffects();

        this.startSpin();
    }

    private startSpin() {
        this.phase = SlotGamePhase.SPINNING;

        // 清除上一局的中獎動畫
        this.reelManager.stopAllWinAnimations();

        // 鍋子動畫：新局開始
        if (this.pot) {
            this.pot.stopAll();
            this.pot.playSpin();
        }

        // 產生盤面
        this.spinMatrix = this.rng.generateMatrix();
        cc.log("🎲 盤面:", JSON.stringify(this.spinMatrix));

        // 開始旋轉
        this.reelManager.spinAll();

        // 1 秒後觸發停輪（依序每 0.2s 停一個 Reel）
        this.scheduleOnce(() => {
            this.phase = SlotGamePhase.STOPPING;
            this.reelManager.stopAll(this.spinMatrix, () => {
                this.onAllReelsStopped();
            });
        }, 1.0);
    }

    private onAllReelsStopped() {
        this.phase = SlotGamePhase.RESULT;

        const { totalMultiplier, results, winPositions } =
            SlotMath.calculateWays(this.spinMatrix);

        cc.log("📊 Ways 結果:", results.map(r =>
            `${SlotSymbolID[r.symbol]} x${r.reelCount}reels, ${r.ways}ways, ${r.totalPayout}x`
        ));
        cc.log("💰 總倍率 (totalMultiplier):", totalMultiplier);

        if (totalMultiplier > 0) {
            const coinsWon = totalMultiplier * this.bet;
            this.credit += coinsWon;
            this.ui.updateScore(this.credit);
            this.ui.showWinAmount(coinsWon);

            // 中獎格閃爍
            this.reelManager.playWinAnimations(winPositions);

            const isBigWin = totalMultiplier >= BIG_WIN_THRESHOLD;

            // 鍋子動畫
            if (this.pot) this.pot.playWin(isBigWin);

            if (isBigWin) {
                this.showBigWin(coinsWon, totalMultiplier);
            } else {
                if (this.fireAudio) {
                    cc.audioEngine.playEffect(this.fireAudio, false);
                }
            }

            cc.log(`🎉 中獎！${coinsWon} 分（倍率 ${totalMultiplier}x）`);
        } else {
            // 未中獎，鍋子回 Idle
            if (this.pot) {
                this.scheduleOnce(() => { this.pot.playIdle(); }, 0.3);
            }
        }

        // ── Scatter 判定（預留 Free Game 入口）
        const scatterCount = SlotMath.checkScatter(this.spinMatrix);
        if (scatterCount >= 3) {
            cc.log(`⭐ Scatter ×${scatterCount}：Free Game 條件成立（目前跳過）`);
        }

        this.phase = SlotGamePhase.IDLE;
        this.handleAutoSpin(totalMultiplier);
    }

    // ─── BigWin 演出 ─────────────────────────────────────────

    private showBigWin(coinsWon: number, multiplier: number) {
        // 委派 UI 播動畫；跑分結束後停金幣與音效
        this.ui.showBigWinAnimation(coinsWon, multiplier, () => {
            this.stopBigWinEffects();
            if (this.pot) this.pot.playIdle();
        });

        if (this.coinSpawner) this.coinSpawner.startContinuousSpawning();

        if (this.bigWinAudio && this.bigWinAudioID === -1) {
            this.bigWinAudioID = cc.audioEngine.playEffect(this.bigWinAudio, true);
        }
    }

    private stopBigWinEffects() {
        if (this.coinSpawner) this.coinSpawner.stopContinuousSpawning();
        if (this.bigWinAudioID !== -1) {
            cc.audioEngine.stopEffect(this.bigWinAudioID);
            this.bigWinAudioID = -1;
        }
    }

    // ─── Auto Spin ───────────────────────────────────────────

    private handleAutoSpin(totalMultiplier: number) {
        cc.log(`🔄 [AutoSpin] 進入 handleAutoSpin, 目前剩餘局數: ${this.autoSpinCount}`);

        if (this.autoSpinCount === 0) {
            cc.log(`🛑 [AutoSpin] 局數為 0，停止自動轉`);
            return;
        }

        if (this.autoSpinCount > 0) {
            this.autoSpinCount--;
            this.ui.updateSpinButton(this.autoSpinCount);
            cc.log(`🔄 [AutoSpin] 扣除一次, 剩下: ${this.autoSpinCount}`);
        }

        // 大獎等久一點，讓玩家看完動畫
        let delay = 1.0;
        if (totalMultiplier > 0) {
            delay = totalMultiplier >= BIG_WIN_THRESHOLD ? 3.0 : 1.6;
        }

        cc.log(`⏳ [AutoSpin] 準備等待 ${delay} 秒後觸發下一次 onSpinClick`);

        this.scheduleOnce(() => {
            cc.log(`⏰ [AutoSpin] 延遲結束！檢查條件：Phase = ${SlotGamePhase[this.phase]}, autoSpinCount = ${this.autoSpinCount}`);
            if (this.phase === SlotGamePhase.IDLE && this.autoSpinCount !== 0) {
                cc.log(`🚀 [AutoSpin] 條件符合，執行 onSpinClick()`);
                this.onSpinClick();
            } else {
                cc.log(`❌ [AutoSpin] 條件不符！無法自動轉`);
            }
        }, delay);
    }
}
