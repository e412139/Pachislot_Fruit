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
const BIG_WIN_THRESHOLD = 20;

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

    @property(cc.AudioClip)
    bgmNormal: cc.AudioClip = null;

    @property(cc.AudioClip)
    bgmFreeGame: cc.AudioClip = null;

    @property(cc.AudioClip)
    sfxFGTrigger: cc.AudioClip = null;

    @property(cc.AudioClip)
    sfxEmptyBottle: cc.AudioClip = null;

    // ─── 私有狀態 ────────────────────────────────────────────

    private phase: SlotGamePhase = SlotGamePhase.IDLE;
    private rng: SlotRNG = new SlotRNG();
    private spinMatrix: SlotSymbolID[][] = null;
    private riggedMatrix: SlotSymbolID[][] = null; // 測試模式用的強制結果
    private riggedMatrixQueue: SlotSymbolID[][][] = []; // 測試模式用的連續盤面序列

    credit: number = 1000;
    bet: number = 10;

    private autoSpinCount: number = 0;   // -1 = 無限
    private isLongPress: boolean = false;
    private bigWinAudioID: number = -1;

    // ─── Free Game 狀態 ──────────────────────────────────────
    private isFreeGame: boolean = false;
    private freeSpinsLeft: number = 0;
    private freeGameTotalWin: number = 0;
    private savedAutoSpinCount: number = 0; // 進入 FG 前保存原本的 AutoSpin 狀態
    private fgMultiplier: number = 2; // 空瓶倍率，預設 2
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

        // 播放一般模式 BGM (考量瀏覽器限制，增加一次性點擊啟動機制)
        if (this.bgmNormal) {
            const playBGM = () => {
                if (cc.audioEngine.getState(cc.audioEngine.getMusicVolume()) !== cc.audioEngine.AudioState.PLAYING) {
                    cc.audioEngine.playMusic(this.bgmNormal, true);
                }
                // 移除監聽
                cc.game.canvas.removeEventListener('mousedown', playBGM);
                cc.game.canvas.removeEventListener('touchstart', playBGM);
            };
            cc.game.canvas.addEventListener('mousedown', playBGM);
            cc.game.canvas.addEventListener('touchstart', playBGM);

            // 嘗試播放 (延遲 0.5 秒，配合轉場感)
            this.scheduleOnce(() => {
                if (!cc.audioEngine.isMusicPlaying()) {
                    cc.audioEngine.playMusic(this.bgmNormal, true);
                }
            }, 0.5);
        }
    }

    onDestroy() {
        if (this.btn_spinNode) {
            this.btn_spinNode.off(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.btn_spinNode.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.btn_spinNode.off(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        }

        // 離開場景時強制停止所有音訊
        cc.audioEngine.stopAll();
        
        // 停止大獎效果 (金幣/重複音效)
        this.stopBigWinEffects();

        // 停止所有排程與 Tween
        this.unscheduleAllCallbacks();
        cc.Tween.stopAllByTarget(this);
    }

    // ─── 觸控 / 長按 ────────────────────────────────────────

    private onTouchStart() {
        cc.log("🖱️ 按下去啦！(TOUCH_START) 目前 Phase=", SlotGamePhase[this.phase]);
        if (this.isFreeGame) return; // Free Game 期間鎖定點擊操作
        if (this.phase !== SlotGamePhase.IDLE) return;
        this.isLongPress = false;
        this.scheduleOnce(this.triggerLongPress, 0.5);
    }

    private onTouchEnd() {
        cc.log("🖱️ 放開啦！(TOUCH_END) 是否為長按？", this.isLongPress);
        this.unschedule(this.triggerLongPress);
        if (this.spinParticle) this.spinParticle.stopSystem();
        if (this.isFreeGame) return; // Free Game 期間鎖定點擊操作
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
        // 如果處於 FG 但次數歸零（正在結算退場），禁止繼續 Spin
        if (this.isFreeGame && this.freeSpinsLeft <= 0) return;

        this.ui.hideAutoSpinMenu();

        if (this.betButtonAudio) {
            cc.audioEngine.playEffect(this.betButtonAudio, false);
        }

        // 普通遊戲時扣除 Credit
        if (!this.isFreeGame) {
            this.credit -= this.bet;
            this.ui.updateScore(this.credit);
        }

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
        if (this.riggedMatrixQueue && this.riggedMatrixQueue.length > 0) {
            this.spinMatrix = this.riggedMatrixQueue.shift();
            cc.log(`🎲 [TEST MODE] 寫死序列盤面 (這局之後還剩 ${this.riggedMatrixQueue.length} 局):`, JSON.stringify(this.spinMatrix));
        } else if (this.riggedMatrix) {
            this.spinMatrix = this.riggedMatrix;
            this.riggedMatrix = null;
            cc.log("🎲 [TEST MODE] 寫死盤面:", JSON.stringify(this.spinMatrix));
        } else {
            this.spinMatrix = this.rng.generateMatrix();
            cc.log("🎲 隨機盤面:", JSON.stringify(this.spinMatrix));
        }

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

        const isScatterTriggered = SlotMath.checkScatterTrigger(this.spinMatrix);
        const isBigWin = totalMultiplier >= BIG_WIN_THRESHOLD;

        if (totalMultiplier > 0) {
            const coinsWon = totalMultiplier * this.bet;
            this.credit += coinsWon;
            this.ui.updateScore(this.credit);
            this.ui.showWinAmount(coinsWon);

            // 中獎格閃爍
            this.reelManager.playWinAnimations(winPositions);

            // 如果是要進入 FG，不要跳大獎彈窗，留給最後 FG 結算
            if (!isScatterTriggered && !this.isFreeGame) {
                if (this.pot) this.pot.playWin(isBigWin);
                if (isBigWin) {
                    this.showBigWin(coinsWon, totalMultiplier);
                } else if (this.fireAudio) {
                    cc.audioEngine.playEffect(this.fireAudio, false);
                }
            } else if (this.isFreeGame) {
                // FG 期間，正常跑鍋子特效與音效
                if (this.pot) this.pot.playWin(isBigWin);
                if (this.fireAudio) cc.audioEngine.playEffect(this.fireAudio, false);
            }

            cc.log(`🎉 中獎！${coinsWon} 分（倍率 ${totalMultiplier}x）`);
        } else {
            // 未中獎，鍋子回 Idle
            if (this.pot) {
                this.scheduleOnce(() => { this.pot.playIdle(); }, 0.3);
            }
        }

        // ── 判斷 SCATTER 是否達成 Free Game 條件 ──────────────────
        if (isScatterTriggered && !this.isFreeGame) {
            cc.log(`⭐ 1, 3, 5 輪皆出現 SCATTER：準備進入 Free Game！`);
            let delayToFG = totalMultiplier > 0 ? 1.5 : 0.5;

            this.scheduleOnce(() => {
                this.prepareEnterFreeGame();
            }, delayToFG);
            return;
        }

        // FG 中正常扣除次數、處理空瓶倍率並進入下一局
        if (this.isFreeGame) {
            this.handleFreeGameSpin(totalMultiplier);
            return;
        }

        // 一般模式結束，看是否 AutoSpin
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

    // ─── Free Game 流程 ──────────────────────────────────────

    private prepareEnterFreeGame() {
        // 💯 在進場前置動作一啟動時，就立刻清空贏分跟所有的連線閃爍框
        this.ui.clearWinAmount();
        this.reelManager.stopAllWinAnimations();

        // 1. 抓取 1, 3, 5 輪 (index 0, 2, 4) 上的 Scatter 節點
        const scatterNodes = this.reelManager.getSymbolNodesByID(SlotSymbolID.SCATTER);
        cc.log(`✨ 找到 ${scatterNodes.length} 個 Scatter 準備旋轉動畫`);
        scatterNodes.forEach(node => {
            // 先停止可能存在的殘留動畫，並將角度強制歸零，確保每次都能完整旋轉
            cc.Tween.stopAllByTarget(node);
            node.angle = 0;

            // 恢復旋轉 720 度動畫
            cc.tween(node)
                .to(1.5, { angle: 720 }, { easing: 'cubicInOut' })
                .start();
        });

        // 播放中獎進入 FG 的音效
        if (this.sfxFGTrigger) {
            cc.audioEngine.playEffect(this.sfxFGTrigger, false);
        }

        // 2. 1.5 秒後 (Scatter動畫播完)，開始轉入 Free Game 場景
        this.scheduleOnce(() => {
            // 彈出「恭喜進入 FG」文字 (總時長 1.5 秒)
            this.ui.showFGCongratsLayout(1.5, () => {
                // 當 Congrats 文字完全消失後，正式啟動 FG 邏輯
                this.enterFreeGame();
            });

            // 💯 轉場密技：
            // 在 Congrats 文字淡入到最顯眼的時候 (約第 0.3 秒)，我們「直接」切換背景！
            // 這樣當 Congrats 在 1.5 秒後淡出時，底下已經悄悄變成 FG 場景了。
            this.scheduleOnce(() => {
                this.ui.swapFreeGameBackground(true);
                // 切換為 FG BGM
                if (this.bgmFreeGame) {
                    cc.audioEngine.playMusic(this.bgmFreeGame, true);
                }
            }, 0.3);

        }, 1.5);
    }

    private enterFreeGame() {
        this.isFreeGame = true;
        this.freeSpinsLeft = 6;
        this.freeGameTotalWin = 0;
        this.fgMultiplier = 2;

        this.savedAutoSpinCount = this.autoSpinCount;
        this.autoSpinCount = 0;

        // 鎖定 UI 狀態
        this.ui.updateSpinButton(this.freeSpinsLeft);
        this.ui.updateFGMultiplier(this.fgMultiplier);

        cc.log(`✅ 恭喜動畫播完，切換至 IDLE 並自動開始第一局`);
        this.phase = SlotGamePhase.IDLE;
        this.onSpinClick();
    }

    private handleFreeGameSpin(totalMultiplier: number) {
        if (totalMultiplier > 0) {
            this.freeGameTotalWin += totalMultiplier * this.bet; // 累積本局原始分數
        }

        // 掃描這局有幾個 BOTTLE
        let bottleNodes: cc.Node[] = this.reelManager.getSymbolNodesByID(SlotSymbolID.BOTTLE);
        let bottleDelay = 0;

        if (bottleNodes.length > 0) {
            cc.log(`🍾 發現 ${bottleNodes.length} 個空瓶！飛行動畫準備`);
            bottleNodes.forEach((node, idx) => {
                // 直接用 symbol node 取得真實世界座標
                const worldPos = node.convertToWorldSpaceAR(cc.Vec2.ZERO);

                this.scheduleOnce(() => {
                    // 播放瓶子飛出的音效
                    if (this.sfxEmptyBottle) {
                        cc.audioEngine.playEffect(this.sfxEmptyBottle, false);
                    }

                    this.ui.playBottleFlyAnimation(worldPos, () => {
                        this.fgMultiplier++;
                        this.ui.updateFGMultiplier(this.fgMultiplier);
                        cc.log(`📈 瓶子到達！當前倍數: x${this.fgMultiplier}`);
                    });
                }, idx * 0.4); // 每個瓶子間隔 0.4s 飛走
            });
            bottleDelay = bottleNodes.length * 0.4 + 0.6; // 等最後一個瓶子到達
        }

        this.freeSpinsLeft--;
        this.ui.updateSpinButton(this.freeSpinsLeft);

        let delayTime = 1.0;
        if (totalMultiplier > 0) {
            delayTime = totalMultiplier >= BIG_WIN_THRESHOLD ? 2.5 : 1.6;
        }

        const waitTime = Math.max(delayTime, bottleDelay);

        if (this.freeSpinsLeft > 0) {
            this.scheduleOnce(() => {
                this.phase = SlotGamePhase.IDLE;
                this.onSpinClick();
            }, waitTime);
        } else {
            // Free Game 8 次結束，進行退場
            this.scheduleOnce(() => {
                this.processFreeGameEnd();
            }, waitTime + 1.0); // 多屏息 1 秒
        }
    }

    private processFreeGameEnd() {
        cc.log(`🏆 Free Game 結束！原始得分: ${this.freeGameTotalWin}, 最終乘數: x${this.fgMultiplier}`);

        // 分數 x FG最終倍數
        const finalWinAmount = this.freeGameTotalWin * this.fgMultiplier;
        const totalFinalMulti = finalWinAmount / this.bet;

        cc.log(`💵 最終大獎金額: ${finalWinAmount} (總倍率: ${totalFinalMulti}x)`);

        if (finalWinAmount > 0) {
            const extraWin = this.freeGameTotalWin * (this.fgMultiplier - 1);
            this.credit += extraWin;
            this.ui.updateScore(this.credit);

            // 展示最終 Total Win 畫面 (停留 2 秒)
            this.ui.showFGTotalWinLayout(finalWinAmount, this.fgMultiplier, 2.0, () => {
                // 停止 FG BGM
                cc.audioEngine.stopMusic();

                // 如果總倍率達到大獎，進行大獎回放演出
                if (totalFinalMulti >= BIG_WIN_THRESHOLD) {
                    this.ui.showBigWinAnimation(finalWinAmount, totalFinalMulti, () => {
                        this.stopBigWinEffects();
                        this.exitFreeGame();
                    });
                    if (this.coinSpawner) this.coinSpawner.startContinuousSpawning();
                    if (this.bigWinAudio && this.bigWinAudioID === -1) {
                        this.bigWinAudioID = cc.audioEngine.playEffect(this.bigWinAudio, true);
                    }
                } else {
                    // 沒有到達 BIG_WIN 則直接退出
                    this.exitFreeGame();
                }
            });
        } else {
            this.exitFreeGame();
        }
    }

    private exitFreeGame() {
        if (this.pot) this.pot.playIdle(); // 確保離開 FG 時停止任何劇烈的鍋子特效

        // 同樣趁魔法圈遮蔽時，無縫清空盤面殘留的贏分狀態
        this.scheduleOnce(() => {
            this.ui.clearWinAmount();
            this.reelManager.stopAllWinAnimations();
        }, 0.5);

        this.ui.playMagicTransition(false, () => {
            this.isFreeGame = false;
            // 回復原本 AutoSpin
            this.autoSpinCount = this.savedAutoSpinCount;
            this.ui.updateSpinButton(this.autoSpinCount);

            this.phase = SlotGamePhase.IDLE;
            if (this.autoSpinCount !== 0) {
                this.handleAutoSpin(0);
            }

            // 回復一般模式 BGM
            if (this.bgmNormal) {
                cc.audioEngine.playMusic(this.bgmNormal, true);
            }
        });
    }

    // ================= 測試模式專用按鈕綁定區 =================

    /**
     * 共用觸發測試盤面函式
     */
    private triggerTestMatrix(matrix: SlotSymbolID[][]) {
        if (this.phase !== SlotGamePhase.IDLE) {
            cc.log("⚠️ 遊戲進行中，無法強制更改盤面！");
            return;
        }
        if (this.autoSpinCount > 0 || this.isFreeGame) {
            cc.log("⚠️ 請先停止自動旋轉或等 Free Game 結束再測試！");
            return;
        }

        this.riggedMatrixQueue = []; // 打斷連續測試序列
        this.riggedMatrix = matrix;
        this.onSpinClick();
    }

    /** 測試 Free Game：強制觸發，並依序控制接下來 8 局的空瓶數量 */
    forceTriggerFreeGame() {
        if (this.phase !== SlotGamePhase.IDLE) {
            cc.log("⚠️ 遊戲進行中，無法強制更改盤面！");
            return;
        }
        if (this.autoSpinCount > 0 || this.isFreeGame) {
            cc.log("⚠️ 請先停止自動旋轉或等 Free Game 結束再測試！");
            return;
        }

        const _ = SlotSymbolID.J; // 用低賠率圖填滿其他格，以免干擾
        const S = SlotSymbolID.SCATTER;
        const B = SlotSymbolID.BOTTLE;

        // --- 1. 進場預備盤面 (確保有 3 個 Scatter 觸發 FG) ---
        const triggerMatrix = [
            [S, _, _, _], // Reel 0
            [_, _, _, _], // Reel 1
            [S, _, _, _], // Reel 2
            [_, _, _, _], // Reel 3
            [S, _, _, _]  // Reel 4
        ];

        // --- 2. FG 8局：使用隨機產生器 (修正：必須傳入 true 才會使用 FG 權重) ---
        const fgQueue: SlotSymbolID[][][] = [];
        for (let i = 0; i < 8; i++) {
            fgQueue.push(this.rng.generateMatrix(true));
        }

        // --- 3. 接合： 先跑觸發的那一把，接著依序排入那8把 FG 結果
        // 注意：這 8 局現在都是完全隨機的，不再有手動寫死的空瓶了
        this.riggedMatrixQueue = [triggerMatrix, ...fgQueue];
        this.onSpinClick();
    }

    /** 測試 Big Win (>=20x)：塞滿 5 輪 S4 確保 25x 中獎 */
    forceBigWin() {
        const T = SlotSymbolID.S4;
        this.triggerTestMatrix([
            [T, SlotSymbolID.J, SlotSymbolID.Q, SlotSymbolID.K],
            [T, SlotSymbolID.J, SlotSymbolID.Q, SlotSymbolID.K],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S1],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S1],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S2]
        ]);
    }

    /** 測試 Mega Win (>=50x)：塞滿 5 輪 S2 確保 60x 中獎 */
    forceMegaWin() {
        const T = SlotSymbolID.S2;
        this.triggerTestMatrix([
            [T, SlotSymbolID.J, SlotSymbolID.Q, SlotSymbolID.K],
            [T, SlotSymbolID.J, SlotSymbolID.Q, SlotSymbolID.K],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S1],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S1],
            [T, SlotSymbolID.S1, SlotSymbolID.S5, SlotSymbolID.S3]
        ]);
    }

    /** 測試 Super Win (>=100x)：塞滿 5 輪 S1 確保 100x 中獎 */
    forceSuperWin() {
        const T = SlotSymbolID.S1;
        this.triggerTestMatrix([
            [T, SlotSymbolID.J, SlotSymbolID.Q, SlotSymbolID.K],
            [T, SlotSymbolID.J, SlotSymbolID.Q, SlotSymbolID.K],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S2],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S2],
            [T, SlotSymbolID.S2, SlotSymbolID.S5, SlotSymbolID.S3]
        ]);
    }

    /** 測試全盤大獎 (Wild 全滿) */
    forceFullWild() {
        const W = SlotSymbolID.WILD;
        this.triggerTestMatrix([
            [W, W, W, W], [W, W, W, W], [W, W, W, W], [W, W, W, W], [W, W, W, W]
        ]);
    }
}
