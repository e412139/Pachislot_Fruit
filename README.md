# 🎰 Light Circus — Slot Game Demo

[![Cocos Creator](https://img.shields.io/badge/Cocos_Creator-2.4.15-blue)](https://www.cocos.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Web_Mobile-green)]()
[![License](https://img.shields.io/badge/License-Personal_Demo-lightgrey)]()

> 兩款完整 HTML5 老虎機與柏青機遊戲，從遊戲邏輯、滾輪動畫到 UI 演出全部自行實作。

**🔗 Live Demo：[GitHub Pages 連結]** 
[試玩連結](https://web-mobile-flame-one.vercel.app/)）

---

## 📌 包含遊戲

| | Game 1 — Pachislot Fruit | Game 2 — Alchemy Slot |
|---|---|---|
| **格局** | 3×3 柏青機 | 5×4 煉金術老虎機 |
| **連線** | 5 條固定連線 | **1024 Ways**（全路徑算法） |
| **特色** | WILD、Scatter、Free Game | 神秘擴展、保底連線、BOTTLE 倍率 |
| **主控** | `GameManager.ts` | `SlotGameCtrl.ts` |

---

## ⚡ 技術亮點

### 1. 1024 Ways 全路徑掃描（`SlotMath.ts`）
放棄傳統固定連線，改用「每輪至少一格符合即計算」的動態算法。Ways 數 = 各輪符合格數的乘積（最高 4⁵ = 1024 Ways），再乘以賠率表。WILD 符號在多條路徑下的倍增邏輯也一併處理。

### 2. 保底連線機制（`SlotReelManager.ts`）
Alchemy Slot 的 **技術設計亮點**。當「神秘門（Mystery Door）」功能觸發但未能形成有效連線時，系統自動在起始列注入 WILD 符號（WILD Injection / Connection Repair），確保玩家一定得到 1024-Ways 獎勵。這是將數值機率設計與玩家心理體驗結合的實際案例。

### 3. 動畫回調安全守衛（`SlotMagicDoorCtrl.ts`）
神秘門有展開動畫，但瀏覽器切換分頁時 Cocos 動畫事件可能丟失，導致遊戲死鎖。解法：以**單次觸發守衛 + 逾時強制結束**確保 callback 一定被呼叫，即使動畫中途中斷。

### 4. iOS Web Audio 跨場景不中斷（`LobbyController.ts`）
解決 iOS Safari 的 Web Audio Context 限制：在 Lobby 的第一次使用者互動時全域解鎖 AudioContext，並用 `cc.game.addPersistRootNode` 保持 BGM 節點跨場景存活，避免進入遊戲後音樂重啟。

### 5. Auto Spin 選單動態綁定（`SlotGameCtrl.ts`）
繞過 Cocos Creator 2.4.x 的 Click Event 與 Prefab 節點層級遮擋 Bug，改用純 TypeScript 的 `TOUCH_END` 座標判定與執行期動態事件綁定，確保 Auto Spin 選單 100% 響應。

---

## 🏗 架構概覽

<details>
<summary>Game 1 — Pachislot Fruit（點開展開）</summary>

```
GameManager（狀態機：IDLE → SPINNING → STOPPING → RESULT）
├── Reel × 3            （每幀移動 5 個 Symbol 節點，循環陣列）
├── RNGService          （加權亂數，產生 3×3 結果矩陣）
├── PayoutService       （5 條連線賠率計算，A=50x / SCATTER=100x）
├── UIController        （BigWin 跑分、Auto Spin 選單、FG 演出）
├── AudioService        （BGM 切換、音效管理，單一職責）
└── CoinSpawner         （NodePool 金幣噴發特效）
```

**Free Game**：盤面 ≥3 SCATTER → 8 局免費旋轉 → 霓虹蛇特效 + 背景無縫切換

</details>

<details>
<summary>Game 2 — Alchemy Slot（點開展開）</summary>

```
SlotGameCtrl（主控制器 / 狀態機）
├── SlotReelManager      （5 輪並行啟停 + Mystery Door WILD 注入）
│   └── SlotReelCtrl × 5 （Snap 對齊 + 0.5s 視認延遲優化）
│       └── SlotSymbolCtrl × 6（符號渲染 + 中獎閃爍）
│       └── SlotMagicDoorCtrl （1×1 → 1×4 擴展動畫 + 回調守衛）
├── SlotMath             （1024 Ways 掃描 + WILD 倍增）
├── SlotRNG              （神秘門觸發率校準 ~1/50）
├── SlotUICtrl           （BIG/MEGA/SUPER Win 分級演出）
└── SlotPotCtrl          （煉金鍋視覺動畫，純裝飾）
```

**Free Game BOTTLE 機制**：每個 BOTTLE 符號飛向 UI 倍率計數器 `fgMultiplier++`，最終得分 = 累積得分 × fgMultiplier。

</details>

---

## 📂 專案結構（簡版）

```
assets/
├── Scene/    lobby.fire / game.fire / slot.fire
├── Script/
│   ├── 【共用】  LobbyController / CoinSpawner
│   ├── 【Game1】 GameManager / Reel / RNGService / PayoutService / UIController / AudioService
│   └── 【Game2】 SlotGameCtrl / SlotReelManager / SlotReelCtrl / SlotMath / SlotRNG ...
├── Texture/
├── audio/
└── html/     slot_rules.html（WebView 說明頁）
```

---

## 🛠 開發環境

- **引擎**：Cocos Creator 2.4.15
- **語言**：TypeScript
- **平台**：Web Mobile
- **部署**：`build/web-mobile/` → GitHub Pages

```bash
# 部署到 GitHub Pages
git subtree push --prefix build/web-mobile origin gh-pages
```

---

## 🎨 鳴謝與素材來源

- **音樂與音效**：音樂與音效素材均來自 [Pixabay](https://pixabay.com/) 平台。
- **圖形素材**：來自 Cocos Creator 官方平台與 AI 輔助設計。            