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
- **起始籌碼**：1000 信用點，每局下注 **10** 點 (Fixed Bet)
- **核心特色**：
    - **1024 Ways**：全路徑連線算法，移除傳統線路限制。
    - **神秘擴展 (Mystery Expansion)**：隨機觸發的 3-Reel 垂直擴展機制，增加盤面覆蓋率。
    - **保底連線機制 (Guaranteed Win Mechanism)**：技術亮點！若神秘門功能觸發卻未中獎，系統自動補入 WILD 確保 1024-Ways 連線。
    - **BOTTLE 煉金倍率**：Free Game 專用機制，倍數可隨空瓶出現無限累積。

### 技術架構

#### 核心組件關係圖

```
SlotGameCtrl（主控制器 / 狀態機）
├── SlotReelManager             （管理 5 個滾輪序列與同步）
│   └── SlotReelCtrl × 5       （單一滾輪邏輯，含 0.5s 視認延遲優化）
│       ├── SlotSymbolCtrl × 6 （每格渲染與 WinAnim 特效）
│       └── SlotMagicDoorCtrl  （神秘門擴展動畫、粒子效果與回調安全）
├── SlotMath                    （1024 Ways 賠率計算與中獎路徑掃描）
├── SlotRNG                     （加權亂數系統，目標觸發率校準至 1/50）
├── SlotUICtrl                  （UI 視覺、WebView 說明、大獎分級演出）
├── SlotPotCtrl                 （煉金鍋視覺反饋與冒煙特效）
└── CoinSpawner                 （高效率金幣物件池 Prefab Spawner）
```

#### 腳本說明

| 檔案 | 技術亮點 / 職責 |
|------|------|
| `SlotGameCtrl.ts` | **中樞狀態機**。嚴謹管理 IDLE → SPINNING → RESULT 循環。特別實作了「輸入鎖定」與「Callback 監測」，防止連點導致的狀態錯亂。 |
| `SlotReelManager.ts` | **並行處理**。除了同步 5 輪啟動外，更負責在 `MagicDoor` 觸發時，動態改寫盤面矩陣執行 **WILD 注入 (Connection Repair)**。 |
| `SlotReelCtrl.ts` | **滾輪控制核心**。支持單一 4-Row 滾輪與緩衝格管理。引入了 **Snap 對齊與回調機制**，確保動畫與邏輯高度同步。 |
| `SlotSymbolCtrl.ts` | **符號渲染與動畫**。封裝了 Symbol 的 Sprite 狀態切換與中獎閃爍特效，支持動態加載。 |
| `SlotMagicDoorCtrl.ts` | **動畫同步**。處理神祕門從 1x1 擴展至 1x4 的視覺動畫，並引入 `0.5s` 的視覺停留，確保玩家能看清轉化符號。 |
| `SlotMath.ts` | **1024 Ways 高效掃描**。採用權重優先算法，搜尋最長連線路徑，並處理 WILD 在多路徑下的倍增邏輯。 |
| `SlotRNG.ts` | **數值校準**。不僅是亂數，更透過加權表將神祕門的單軸出現率精確校準，達成約 **1/50** 的大功能觸發頻率。 |
| `SlotUICtrl.ts` | **分級演出邏輯**。根據總贏分倍數，精確切換 BIG(50x)、MEGA(100x)、SUPER(200x) 三個等級的演出效果。 |
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
| S1（藥水）| 15x | 40x | 100x |
| S2（蒸餾器）| 10x | 25x | 60x |
| S3（研磨缽）| 8x | 16x | 40x |
| S4（魔法秘方）| 6x | 12x | 25x |
| S5（藥草）| 5x | 10x | 20x |
| A | 5x | 10x | 20x |
| K | 4x | 8x | 15x |
| Q | 4x | 8x | 15x |
| J | 3x | 6x | 10x |
| TEN | 3x | 6x | 10x |
| WILD | — | — | 替代所有符號 |
| SCATTER | — | — | 觸發 Free Game（第 1、3、5 輪各出現） |
| BOTTLE | — | — | Free Game 專用，飛向倍率計數器 +1 |

#### 大獎分級演出門檻

為優化遊戲節奏，避免過度演出，調整門檻如下：

| 倍率 (Total Multiplier) | 演出標題 | 視覺反饋 |
|------|--------|--------|
| **≥ 50x** | **BIG WIN** | 金幣噴發 + 標題彈跳 |
| **≥ 100x** | **MEGA WIN** | 強烈標題脈衝 + 長時間金幣演出 |
| **≥ 200x** | **SUPER WIN** | 頂級演出特效 |

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
       ├─ totalMultiplier ≥ 50 → showBigWin()
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
forceBigWin()           // 全 5 輪塞滿 S2，確保產出 60x（符合 Big Win 門檻）
forceMegaWin()          // 全 5 輪塞滿 S1，確保產出 100x（符合 Mega Win）
forceSuperWin()         // 全 5 輪塞滿 S1 並達成 2 Ways，確保產出 200x（符合 Super Win）
forceFullWild()         // 全盤 WILD，觸發最大倍率
```

### 展示亮點

- **穩健的動畫回調安全 (Animation Callback Safety)**：
    在 `SlotMagicDoorCtrl` 中實作了單次觸發守衛與逾時強制結束機制，防止因為動畫事件丟失（例如瀏覽器切換分頁）導致的遊戲死鎖。
- **神秘擴展 (Mystery Expansion)**：
    畫面上隨機出現神秘門，揭曉時會垂直擴展並轉化為相同的煉金符號。
- **保底連線機制 (Guaranteed Win Mechanism)**：
    若神秘門觸發後未能形成有效連線，系統將在起始列補入 **WILD** 符號，確保 1024-Ways 獎勵！這是一個將「數值機率」與「玩家心理平衡」結合的代碼實踐。
- **HTML5 跨端 UI 整合**：
    遊戲說明頁面採用響應式 HTML + WebView 整合，支持流暢的手勢滑動與分頁導航，降低遊戲包體並提高內容維護效率。
- **音訊環境優化 (Web Audio Unlock)**：
    實作了全域點擊解鎖 Web Audio Context 的技術，解決了 iOS Safari 上背景音樂無法自動播放或在切換場景後重啟的問題。
- **iOS 風格自定義彈窗系統 (iOS-Style Modal System)**：
    捨棄系統預設 `alert`，在 `SlotUICtrl` 中移植了原生感十足的動態模糊背景與彈窗動畫，提升遊戲整體的商業品牌感。
- **開發效率繞過 (Engine Bug Workarounds)**：
    針對 Cocos Creator 2.4.x 的 Click Event 與 Prefab 節點層級遮擋 Bug，採用純代碼層的 `TOUCH_END` 座標判定與動態綁定技術，確保 Auto Spin 選單 100% 反饋。

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
