// SlotGameCtrl.ts
// 主控制器（組裝 + 協調）：持有 Inspector 屬性、實作所有 delegate、測試模式入口
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
import SlotReelManager from "./SlotReelManager";
import SlotUICtrl from "./SlotUICtrl";
import SlotPotCtrl from "./SlotPotCtrl";
import CoinSpawner from "./CoinSpawner";
import SlotBigWinPresenter from "./SlotBigWinPresenter";
import SlotSpinFlowController from "./SlotSpinFlowController";
import SlotFreeGameController from "./SlotFreeGameController";
import SlotAutoSpinController from "./SlotAutoSpinController";
import SlotInputHandler from "./SlotInputHandler";
import {
    SpinResultData,
    ISpinFlowDelegate,
    IFreeGameDelegate,
    IInputDelegate,
    IAutoSpinDelegate,
} from "./SlotInterfaces";

const { ccclass, property } = cc._decorator;

@ccclass
export default class SlotGameCtrl extends cc.Component
    implements ISpinFlowDelegate, IFreeGameDelegate, IInputDelegate, IAutoSpinDelegate {

    // ─── Inspector 屬性 ──────────────────────────────────────

    @property(SlotReelManager)
    reelManager: SlotReelManager = null;

    @property(SlotUICtrl)
    ui: SlotUICtrl = null;

    @property(SlotPotCtrl)
    pot: SlotPotCtrl = null;

    @property(CoinSpawner)
    coinSpawner: CoinSpawner = null;

    @property(cc.Toggle)
    toggleSpeed: cc.Toggle = null;

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

    // ─── 遊戲狀態（由 SlotGameCtrl 統一持有）────────────────

    private phase: SlotGamePhase = SlotGamePhase.IDLE;
    credit: number = 1000;
    bet: number = 10;
    private isFreeGame: boolean = false;
    private savedAutoSpinCount: number = 0;

    // ─── 盤面產生（含測試模式用的寫死序列）──────────────────

    private rng: SlotRNG = new SlotRNG();
    private riggedMatrix: SlotSymbolID[][] = null;
    private riggedMatrixQueue: SlotSymbolID[][][] = [];

    // ─── 子 Controller ───────────────────────────────────────

    private bigWin: SlotBigWinPresenter;
    private spinFlow: SlotSpinFlowController;
    private freeGame: SlotFreeGameController;
    private autoSpin: SlotAutoSpinController;
    private inputHandler: SlotInputHandler;

    // ─── 生命週期 ────────────────────────────────────────────

    onLoad() {
        this.bigWin = new SlotBigWinPresenter(this.ui, this.pot, this.coinSpawner, this.bigWinAudio);

        this.spinFlow = new SlotSpinFlowController(
            this.reelManager, this.pot, this.ui,
            this.fireAudio, this, this.bigWin, this
        );

        this.freeGame = new SlotFreeGameController(
            this.reelManager, this.pot, this.ui, this.coinSpawner, this,
            this.bigWin, this.sfxFGTrigger, this.sfxEmptyBottle,
            this.bgmNormal, this.bgmFreeGame, this
        );

        this.autoSpin = new SlotAutoSpinController(
            this.ui, this.toggleSpeed, this,
            () => this.phase === SlotGamePhase.IDLE,
            this
        );

        this.inputHandler = new SlotInputHandler(
            this.spinParticle, this.ui, this,
            () => this.phase,
            () => this.isFreeGame,
            this
        );

        this.ui.updateScore(this.credit);
        this.ui.clearWinAmount();
        this.ui.hideBigWinLayer();
        this.ui.updateSpinButton(0);

        if (this.spinParticle) this.spinParticle.stopSystem();

        if (this.btn_spinNode) {
            this.btn_spinNode.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.btn_spinNode.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.btn_spinNode.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        }

        if (this.ui && this.ui.node_AutoSpinMenu) {
            this.autoSpin.bindButtons(this.ui.node_AutoSpinMenu);
        }

        if (this.bgmNormal && !cc.audioEngine.isMusicPlaying()) {
            cc.audioEngine.playMusic(this.bgmNormal, true);
        }
    }

    onDestroy() {
        if (this.btn_spinNode) {
            this.btn_spinNode.off(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.btn_spinNode.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.btn_spinNode.off(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        }

        cc.audioEngine.stopAll();
        if (this.bigWin) this.bigWin.stopBigWinEffects();
        this.unscheduleAllCallbacks();
        cc.Tween.stopAllByTarget(this);
    }

    // ─── 觸控中繼（轉交 InputHandler）────────────────────────

    private onTouchStart() { this.inputHandler.onTouchStart(); }
    private onTouchEnd() { this.inputHandler.onTouchEnd(); }
    private onTouchCancel() { this.inputHandler.onTouchCancel(); }

    // ─── IInputDelegate ──────────────────────────────────────

    onSpinRequested(): void {
        this.autoSpin.reset();
        this.onSpinClick();
    }

    // ─── 主旋轉入口（供 InputHandler、AutoSpin、FreeGame 共用）

    onSpinClick(): void {
        if (this.phase !== SlotGamePhase.IDLE) return;
        if (this.isFreeGame && this.freeGame.freeSpinsLeft <= 0) return;

        this.ui.hideAutoSpinMenu();

        if (this.betButtonAudio) {
            cc.audioEngine.playEffect(this.betButtonAudio, false);
        }

        if (!this.isFreeGame) {
            this.credit -= this.bet;
            this.ui.updateScore(this.credit);
        }

        this.ui.clearWinAmount();
        this.ui.hideBigWinLayer();
        this.bigWin.stopBigWinEffects();

        this.phase = SlotGamePhase.SPINNING;
        const matrix = this.generateMatrix();
        const isQuickSpin = this.toggleSpeed ? this.toggleSpeed.isChecked : false;

        this.spinFlow.startSpin({ bet: this.bet, isFreeGame: this.isFreeGame, isQuickSpin, matrix });
    }

    private generateMatrix(): SlotSymbolID[][] {
        if (this.riggedMatrixQueue && this.riggedMatrixQueue.length > 0) {
            const m = this.riggedMatrixQueue.shift();
            cc.log(`🎲 [TEST MODE] 寫死序列盤面 (這局之後還剩 ${this.riggedMatrixQueue.length} 局):`, JSON.stringify(m));
            return m;
        }
        if (this.riggedMatrix) {
            const m = this.riggedMatrix;
            this.riggedMatrix = null;
            cc.log("🎲 [TEST MODE] 寫死盤面:", JSON.stringify(m));
            return m;
        }
        const m = this.rng.generateMatrix();
        cc.log("🎲 隨機盤面:", JSON.stringify(m));
        return m;
    }

    // ─── ISpinFlowDelegate ───────────────────────────────────

    onEnterStoppingPhase(): void {
        this.phase = SlotGamePhase.STOPPING;
    }

    onEnterResultPhase(): void {
        this.phase = SlotGamePhase.RESULT;
    }

    onSpinResult(result: SpinResultData): void {
        if (result.coinsWon > 0) {
            this.credit += result.coinsWon;
            this.ui.updateScore(this.credit);
        }

        if (result.isScatterTriggered && !this.isFreeGame) {
            cc.log(`⭐ 1, 3, 5 輪皆出現 SCATTER：準備進入 Free Game！`);
            const delay = result.totalMultiplier > 0 ? 1.5 : 0.5;
            this.scheduleOnce(() => { this.freeGame.prepareEnterFreeGame(); }, delay);
            return;
        }

        if (this.isFreeGame) {
            this.freeGame.handleFGSpin(result.totalMultiplier, this.bet);
            return;
        }

        this.phase = SlotGamePhase.IDLE;
        this.autoSpin.handleAutoSpin(result.totalMultiplier);
    }

    // ─── IFreeGameDelegate ───────────────────────────────────

    onFreeGameEntered(): void {
        this.isFreeGame = true;
        this.savedAutoSpinCount = this.autoSpin.count;
        this.autoSpin.count = 0;
        this.phase = SlotGamePhase.IDLE;
        this.onSpinClick();
    }

    onFGNextSpin(): void {
        this.phase = SlotGamePhase.IDLE;
        this.onSpinClick();
    }

    onFGBonusWin(extraWin: number): void {
        this.credit += extraWin;
        this.ui.updateScore(this.credit);
    }

    onFreeGameExited(): void {
        this.isFreeGame = false;
        this.autoSpin.count = this.savedAutoSpinCount;
        this.ui.updateSpinButton(this.autoSpin.count);
        this.phase = SlotGamePhase.IDLE;
        if (this.autoSpin.count !== 0) {
            this.autoSpin.handleAutoSpin(0);
        }
    }

    // ─── IAutoSpinDelegate ───────────────────────────────────

    onAutoSpinTick(): void {
        this.onSpinClick();
    }

    // ─── 場景 Click Event 相容（供 Inspector 設定的按鈕呼叫）─

    onAutoSpinSelected(event: any, data: string): void {
        this.autoSpin.onAutoSpinSelected(parseInt(data));
    }

    // ================= 測試模式專用 =================

    private checkTestModeLocked(): boolean {
        if (this.isFreeGame) {
            this.ui.showIOSAlert("免費遊戲期間禁止使用大獎測試功能！");
            return true;
        }
        if (this.autoSpin.count !== 0) {
            this.ui.showIOSAlert("請先點擊主畫面的 Spin 按鈕終止「自動旋轉」後，再進行大獎測試！");
            return true;
        }
        if (this.phase !== SlotGamePhase.IDLE) {
            this.ui.showIOSAlert("請等待當前旋轉結束並結算完成後，再進行測試！");
            return true;
        }
        return false;
    }

    private triggerTestMatrix(matrix: SlotSymbolID[][]): void {
        if (this.checkTestModeLocked()) return;
        this.riggedMatrixQueue = [];
        this.riggedMatrix = matrix;
        this.onSpinClick();
    }

    forceTriggerFreeGame(): void {
        if (this.checkTestModeLocked()) return;

        const _ = SlotSymbolID.J;
        const S = SlotSymbolID.SCATTER;

        const triggerMatrix = [
            [S, _, _, _],
            [_, _, _, _],
            [S, _, _, _],
            [_, _, _, _],
            [S, _, _, _]
        ];

        const fgQueue: SlotSymbolID[][][] = [];
        for (let i = 0; i < 8; i++) {
            fgQueue.push(this.rng.generateMatrix(true));
        }

        this.riggedMatrixQueue = [triggerMatrix, ...fgQueue];
        this.onSpinClick();
    }

    forceBigWin(): void {
        if (this.checkTestModeLocked()) return;
        const T = SlotSymbolID.S2;
        this.triggerTestMatrix([
            [T, SlotSymbolID.J, SlotSymbolID.Q, SlotSymbolID.K],
            [T, SlotSymbolID.J, SlotSymbolID.Q, SlotSymbolID.K],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S1],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S1],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S3]
        ]);
    }

    forceMegaWin(): void {
        if (this.checkTestModeLocked()) return;
        const T = SlotSymbolID.S1;
        this.triggerTestMatrix([
            [T, SlotSymbolID.J, SlotSymbolID.Q, SlotSymbolID.K],
            [T, SlotSymbolID.J, SlotSymbolID.Q, SlotSymbolID.K],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S2],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S2],
            [T, SlotSymbolID.S2, SlotSymbolID.S5, SlotSymbolID.S3]
        ]);
    }

    forceSuperWin(): void {
        if (this.checkTestModeLocked()) return;
        const T = SlotSymbolID.S1;
        this.triggerTestMatrix([
            [T, T, SlotSymbolID.Q, SlotSymbolID.K],
            [T, SlotSymbolID.J, SlotSymbolID.Q, SlotSymbolID.K],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S2],
            [T, SlotSymbolID.TEN, SlotSymbolID.A, SlotSymbolID.S2],
            [T, SlotSymbolID.S2, SlotSymbolID.S5, SlotSymbolID.S3]
        ]);
    }

    forceFullWild(): void {
        if (this.checkTestModeLocked()) return;
        const W = SlotSymbolID.WILD;
        this.triggerTestMatrix([
            [W, W, W, W], [W, W, W, W], [W, W, W, W], [W, W, W, W], [W, W, W, W]
        ]);
    }

    forceMagicDoor(): void {
        if (this.checkTestModeLocked()) return;
        const M = SlotSymbolID.MAGIC_DOOR;
        const A = SlotSymbolID.A;
        const W = SlotSymbolID.WILD;
        this.triggerTestMatrix([
            [M, M, M, A],
            [A, W, A, A],
            [A, W, A, A],
            [A, A, M, M],
            [M, M, M, M]
        ]);
    }
}
