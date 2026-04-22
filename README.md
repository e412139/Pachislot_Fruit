# 🎰 Light Circus — Pachislot & Alchemy Slot

> **Cocos Creator 2.4.15 · TypeScript · Web Mobile**

本專案包含兩款完整的 HTML5 卡帶老虎機遊戲，透過同一個大廳（Lobby）場景選擇進入。

---

## 目錄

1. [專案概覽](#專案概覽)
2. [場景結構](#場景結構)
3. [Game 1：Pachislot Fruit（3×3 柏青機）](#game-1pachislot-fruit3×3-柏青機)
4. [Game 2：Alchemy Slot（5×4 煉金術老虎機）](#game-2alchemy-slot5×4-煉金術老虎機)
5. [共用元件](#共用元件)
6. [開發環境](#開發環境)

---

## 專案概覽

| 項目 | 內容 |
|------|------|
| 引擎版本 | Cocos Creator 2.4.15 |
| 語言 | TypeScript |
| 目標平台 | Web Mobile（可部署至 GitHub Pages 等靜態服務） |
| 場景數量 | 3（lobby、game、slot） |
| 腳本數量 | 21 個 `.ts` 元件 |

---

## 場景結構

```
lobby.fire   ─── 大廳：選擇進入 Pachislot Fruit 或 Alchemy Slot
game.fire    ─── Pachislot Fruit（3×3 柏青機）
slot.fire    ─── Alchemy Slot（5×4 煉金老虎機）
```

**大廳入口邏輯（`LobbyController.ts`）**

```typescript
enterGame()  → cc.director.loadScene("game");   // 進入柏青機
enterSlot()  → cc.director.loadScene("slot");   // 進入煉金老虎機
```

---

## Game 1：Pachislot Fruit（3×3 柏青機）

### 遊戲簡介

- **格局**：3 滾輪 × 3 格（3×3）
- **連線規則**：5 條連線（3 條橫向 + 2 條對角斜線）
- **起始籌碼**：1000 信用點，每局下注 10 點
- **特色**：霓虹燈特效、WILD 替代、Scatter 觸發 Free Game（8 局）

### 技術架構

#### 核心組件關係圖

```
GameManager（主控制器）
├── Reel × 3            （滾輪動畫與停輪對齊）
├── RNGService          （加權亂數 3×3 盤面產生）
├── PayoutService       （5 條連線賠率計算）
├── UIController        （所有 UI 視覺呈現）
├── AudioService        （背景音樂與音效管理）
└── CoinSpawner         （大獎金幣噴發特效）
```

#### 腳本說明

| 檔案 | 責任 |
|------|------|
| `GameManager.ts` | **主控制器**。管理遊戲狀態機（IDLE → SPINNING → STOPPING → RESULT）、觸控長按、Auto Spin、Free Game 流程協調 |
| `Reel.ts` | 單一滾輪控制。以 `update()` 每幀移動 5 個 Symbol 節點（循環陣列），停輪時依序填入目標 Symbol，對齊後觸發 callback |
| `RNGService.ts` | 以加權機率（A:5、B:10、C:20、D:30、WILD:3、SCATTER:2）隨機產生 3×3 結果矩陣 |
| `PayoutService.ts` | 對一條 3 格連線評估賠率：A=50x、B=20x、C=10x、D=5x，WILD 作替代，SCATTER 三連=100x |
| `UIController.ts` | 管理分數顯示、BigWin 彈窗（跑分動畫）、Auto Spin 選單、FG 恭喜畫面、背景切換、霓虹蛇特效、說明 WebView |
| `AudioService.ts` | 封裝 BGM（Normal/FreeGame）與音效（FG Trigger）的播放與停止，遵循單一職責原則 |

#### 連線賠率表

| 符號 | 倍率 |
|------|------|
| A（最高）| 50x |
| B | 20x |
| C | 10x |
| D（最低）| 5x |
| SCATTER × 3 | 100x |
| WILD | 替代任意符號 |

#### 遊戲流程

```
按下 Spin
  └─ 扣除 bet（Free Game 期間免扣）
  └─ startSpin()：所有滾輪同時旋轉
  └─ 1秒後 stopReels()：依序停輪
  └─ onResult()：
       ├─ 計算 5 條連線得分
       ├─ 掃描 Scatter 位置
       ├─ totalMultiplier ≥ 10 → showBigWin()
       ├─ Scatter ≥ 3 → prepareEnterFreeGame()
       └─ 若為 Free Game → handleFreeGameSpin()
```

#### Free Game 機制

1. 盤面出現 **≥ 3 個 SCATTER** 觸發
2. 播放 FG Trigger 音效 + 恭喜過渡畫面（淡入淡出 1.5 秒）
3. 同步無縫切換背景圖與 BGM（在恭喜畫面遮蔽期間替換）
4. 進入 **8 局** Free Game（不扣 Credit）
5. 霓虹蛇特效（`anim_neon_fg_snake`）全程開啟
6. FG 結束後計算累積總贏分，若倍率 ≥ 10 觸發 BigWin 演出
7. 切換回常模背景與 BGM

#### BigWin 演出

| 倍率 | 標題圖 |
|------|--------|
| ≥ 10x | Big Win |
| ≥ 20x | Mega Win |
| ≥ 50x | Super Win |

演出流程：標題圖彈跳出現 → 跑分動畫（2 秒） → 金幣噴發 → 0.5 秒停留 → 自動隱藏

#### 長按 / Auto Spin

- **短按**：執行一次普通旋轉
- **長按 ≥ 0.5 秒**：粒子爆發特效 + 展開 Auto Spin 選單（20 / 50 / 100 / 250 / ∞ 局）
- Auto Spin 狀態下 Spin 按鈕顯示剩餘局數；短按可中斷

#### 測試模式指令

```typescript
forceWinA()       // 中線三顆 A，觸發 50x
forceWinB()       // 中線三顆 B，觸發 20x
forceWinC()       // 中線三顆 C，觸發 10x
forceWinD()       // 中線三顆 D，觸發 5x
forceFreeGame()   // 強制觸發 3 Scatter 中獎流程
```

---

## Game 2：Alchemy Slot（5×4 煉金術老虎機）

### 遊戲簡介

- **格局**：5 滾輪 × 4 格（5×4）
- **連線規則**：**1024 Ways**（不計固定連線，只要同一符號從第 1 輪開始每輪至少出現 1 格即得分；5 輪 × 每輪最多 4 格符合 = 4⁵ = 1024）
- **起始籌碼**：1000 信用點，每局下注 10 點
- **特色**：煉金鍋裝飾動畫、BOTTLE 空瓶倍率累積機制、魔法圈轉場特效、Free Game 8 局

### 技術架構

#### 核心組件關係圖

```
SlotGameCtrl（主控制器）
├── SlotReelManager             （管理 5 個滾輪）
│   └── SlotReelCtrl × 5       （單一滾輪，4 rows + 上下緩衝格）
│       └── SlotSymbolCtrl × 6 （每格 Symbol 渲染與動畫）
├── SlotMath                    （243 Ways 賠率計算靜態函式庫）
├── SlotRNG                     （加權亂數，Normal/FreeGame 雙權重表）
├── SlotUICtrl                  （全部 UI 視覺控制）
├── SlotPotCtrl                 （煉金鍋裝飾動畫）
└── CoinSpawner                 （大獎金幣噴發，與 Game 1 共用）
```

#### 腳本說明

| 檔案 | 責任 |
|------|------|
| `SlotGameCtrl.ts` | **主控制器**。管理 `SlotGamePhase` 狀態機（IDLE → SPINNING → STOPPING → RESULT）、觸控、Auto Spin、Free Game 全流程、BOTTLE 倍率 |
| `SlotReelManager.ts` | 管理 5 個 `SlotReelCtrl`，統一呼叫 `spinAll()`、`stopAll()`（各輪依 `REEL_STOP_DELAYS[0.0, 0.2, 0.4, 0.6, 0.8]` 秒差停輪） |
| `SlotReelCtrl.ts` | 單一 4-Row 滾輪。維護 ROW_COUNT+2 個 Symbol 節點（上下各加 1 格緩衝）；以循環陣列 + `offsetY` 每幀滾動；停輪時由下往上填入目標 Symbol，snap 對齊後回調 |
| `SlotSymbolCtrl.ts` | 單格 Symbol 渲染（切換 SpriteFrame）與閃爍中獎動畫（`playWinAnim` / `stopWinAnim`） |
| `SlotMath.ts` | **純靜態計算**。`calculateWays()` 對 10 種有賠率 Symbol 計算 3/4/5 輪最長連線 Ways 數與總倍率；`checkScatterTrigger()` 確認第 1、3、5 輪（index 0、2、4）各有 SCATTER |
| `SlotRNG.ts` | 加權亂數生成器。Normal/FreeGame 各有獨立權重表；`generateMatrix(isFreeGame)` 產生 5×4 矩陣 |
| `SlotWeightTable.ts` | 定義 Normal 與 FreeGame 兩套權重表（普通模式 BOTTLE 不出現；FG 模式 SCATTER 不出現，BOTTLE 出現） |
| `SlotPaytable.ts` | 各 Symbol 賠率表（3/4/5 輪），以物件字面量定義 |
| `SlotSymbolDef.ts` | `SlotSymbolID` 列舉（S1~S5、TEN/J/Q/K/A、WILD、SCATTER、BOTTLE） |
| `SlotGameState.ts` | `SlotGamePhase` 列舉（IDLE、SPINNING、STOPPING、RESULT） |
| `SlotPotCtrl.ts` | 煉金鍋裝飾動畫（`playIdle`/`playSpin`/`playWin(isBigWin)`/`stopAll`），純視覺、不參與業務邏輯 |
| `SlotUICtrl.ts` | 管理所有 UI：分數與贏分顯示、BigWin 彈窗（跑分 + 脈衝動畫）、Auto Spin 選單、FG 恭喜畫面、魔法圈轉場（遮蔽時無縫換背景 + 換鍋子圖）、BOTTLE 飛行動畫、FG 結算 Total Win 畫面、說明 WebView |

#### 符號賠率表（1024 Ways）

> **最大 Ways 數 = 4⁵ = 1024**（5 輪、每輪 4 行，若每輪都符合且每格都中獎）
>
> 倍率 = `paytable[symbol][reelCount] × 中獎 Ways 數`

| 符號 | 3 輪 | 4 輪 | 5 輪 |
|------|------|------|------|
| S1（液體，最稀有）| 15x | 40x | 100x |
| S2（藥草）| 10x | 25x | 60x |
| S3（搗藥器）| 8x | 16x | 40x |
| S4（玻璃瓶）| 6x | 12x | 25x |
| S5（蒸餾器）| 5x | 10x | 20x |
| A | 5x | 10x | 20x |
| K | 4x | 8x | 15x |
| Q | 4x | 8x | 15x |
| J | 3x | 6x | 10x |
| TEN | 3x | 6x | 10x |
| WILD | — | — | 替代所有符號 |
| SCATTER | — | — | 觸發 Free Game（第 1、3、5 輪各出現） |
| BOTTLE | — | — | Free Game 專用，飛向倍率計數器 +1 |

BigWin 觸發門檻：**totalMultiplier ≥ 20**（`BIG_WIN_THRESHOLD`）

| 倍率 | 標題圖 |
|------|--------|
| ≥ 20x | Big Win |
| ≥ 50x | Mega Win |
| ≥ 100x | Super Win |

#### 遊戲流程

```
按下 Spin
  └─ 扣除 bet（Free Game 期間免扣）
  └─ startSpin()：
       ├─ SlotPotCtrl.playSpin()（鍋子跳動）
       └─ SlotReelManager.spinAll()（5 輪同時旋轉）
  └─ 1秒後 SlotReelManager.stopAll()（依序間隔 0.2s 停輪）
  └─ onAllReelsStopped()：
       ├─ SlotMath.calculateWays()（計算 243 Ways 總倍率）
       ├─ SlotMath.checkScatterTrigger()（第 1、3、5 輪是否各有 SCATTER）
       ├─ 中獎格閃爍動畫
       ├─ totalMultiplier ≥ 20 → showBigWin()
       ├─ SCATTER 觸發 → prepareEnterFreeGame()
       └─ Free Game 中 → handleFreeGameSpin()
```

#### Free Game 機制（含 BOTTLE 倍率）

1. **觸發條件**：第 1、3、5 輪（index 0、2、4）各至少出現 **1 個 SCATTER**
2. **前置演出**：
   - Scatter 格節點旋轉 720° 動畫（1.5 秒）
   - 播放 `sfxFGTrigger` 音效
   - 0.3 秒後無縫切換背景 + FG BGM
   - 顯示「恭喜進入 Free Game」Congrats Layout（淡入淡出 1.5 秒）
3. **進入 Free Game**：共 **8 局**，不扣 Credit，初始倍率 `fgMultiplier = 2`
4. **BOTTLE 倍率累積**：
   - 每局掃描盤面上的 BOTTLE 格
   - 每個 BOTTLE 播放飛行動畫飛向 UI 倍率計數器
   - 每到達一個 `fgMultiplier++`（最終倍率可超過 2）
5. **FG 結算**：`最終得分 = freeGameTotalWin × fgMultiplier`，額外增加的分數補記到 Credit
6. **退場**：魔法圈特效（`playMagicTransition`）遮蔽畫面 → 切回普通背景 → 播放 Normal BGM

#### 1024 Ways 計算邏輯（`SlotMath.calculateWays`）

```
對每種 Symbol（10 種有賠率 Symbol）：
  從最長（5輪）到最短（3輪）搜尋：
    每輪至少有 1 格是該 symbol 或 WILD → valid
    ways = 各輪符合格數的乘積
    totalPayout = ways × paytable[symbol][reelCount]
  取最長有效連線，不重複累計
合計所有 Symbol 的 totalPayout → totalMultiplier
```

#### 長按 / Auto Spin

- 與 Game 1 相同機制（短按/長按、Auto Spin 選單 20/50/100/250/∞）
- Free Game 期間觸控輸入鎖定，強制自動跑完 8 局
- 以程式碼動態綁定選單按鈕（繞過 Cocos 編輯器 Click Event 層級 Bug）

#### 測試模式指令

```typescript
forceTriggerFreeGame()  // 強制觸發 FG（第 1、3、5 輪各一個 SCATTER），接著 8 局使用隨機 FG 矩陣
forceBigWin()           // 全 5 輪塞滿 S4，確保 ≥ 20x（Big Win 門檻）
forceMegaWin()          // 全 5 輪塞滿 S2，確保 ≥ 50x（Mega Win）
forceSuperWin()         // 全 5 輪塞滿 S1，確保 ≥ 100x（Super Win）
forceFullWild()         // 全盤 WILD，觸發最大倍率
```

---

## 共用元件

| 元件 | 用途 |
|------|------|
| `CoinSpawner.ts` | 兩款遊戲共用。BigWin 期間以 `cc.NodePool` 循環利用金幣 Prefab，每 0.08 秒噴發一波（數量遞增至 30 枚/波），拋物線 + 旋轉 + 淡出動畫 |
| `node_Symbol.prefab` | Game 1 的滾輪格（含 `Symbol.ts`） |
| `node_SlotSymbol.prefab` | Game 2 的滾輪格（含 `SlotSymbolCtrl.ts`） |
| `node_Reel.prefab` | Game 1 的滾輪節點 |
| `node_fly_Particle.prefab` | BOTTLE 飛行動畫粒子 |
| `gold.prefab` | 金幣噴發用 Prefab |
| `mikado_outline_shadow.fnt` | 自訂點陣字型（BigWin 跑分顯示） |

---

## 開發環境

### 需求

- **Cocos Creator 2.4.15**
- Node.js（編譯 TypeScript 時由 Creator 內建）

### 本地開啟

1. 使用 Cocos Creator 2.4.15 開啟專案根目錄（`Pachislot_Fruit/`）
2. 在 Creator 編輯器中按 **Play** 預覽，或選擇 **Build** → **Web Mobile** 打包

### 部署

打包產出目錄為 `build/web-mobile/`，可直接上傳至任何靜態網頁服務（GitHub Pages、Netlify 等）。

```bash
# 範例：上傳至 GitHub Pages（gh-pages 分支）
git subtree push --prefix build/web-mobile origin gh-pages
```

---

## 專案架構一覽

```
assets/
├── Scene/
│   ├── lobby.fire   ── 大廳（LobbyController）
│   ├── game.fire    ── Pachislot Fruit
│   └── slot.fire    ── Alchemy Slot
├── Script/
│   │── 【共用】
│   ├── LobbyController.ts       ── 大廳場景切換
│   ├── CoinSpawner.ts           ── 金幣噴發（兩款共用）
│   │── 【Pachislot Fruit】
│   ├── GameManager.ts           ── 主控制器
│   ├── Reel.ts                  ── 滾輪
│   ├── Symbol.ts                ── 符號元件
│   ├── RNGService.ts            ── 亂數服務
│   ├── PayoutService.ts         ── 連線賠率
│   ├── UIController.ts          ── UI 控制器
│   ├── AudioService.ts          ── 音訊服務
│   ├── Enums.ts                 ── GameState / SymbolType 列舉
│   │── 【Alchemy Slot】
│   ├── SlotGameCtrl.ts          ── 主控制器
│   ├── SlotReelManager.ts       ── 5 輪管理
│   ├── SlotReelCtrl.ts          ── 單輪控制
│   ├── SlotSymbolCtrl.ts        ── 單格符號
│   ├── SlotMath.ts              ── 243 Ways 計算
│   ├── SlotRNG.ts               ── 加權亂數
│   ├── SlotWeightTable.ts       ── 出現權重表
│   ├── SlotPaytable.ts          ── 賠率表
│   ├── SlotSymbolDef.ts         ── SlotSymbolID 列舉
│   ├── SlotGameState.ts         ── SlotGamePhase 列舉
│   ├── SlotUICtrl.ts            ── UI 控制器
│   └── SlotPotCtrl.ts           ── 煉金鍋動畫
├── Texture/                     ── 所有貼圖資源
├── audio/                       ── BGM 與音效
└── ...（prefab、fnt、anim 等）
```
