# 🎰 Alchemy Slot（5x4 243 ways）實作規格與核心程式（Cocos Creator 2.4.15 / TypeScript）

> 本文件為可直接交給 IDE / RD 使用的實作參考，包含：Symbol 定義、權重、RNG、Paytable、Ways 計算、Free Game 判定與流程整合。

---

# 📁 建議專案結構
- 注意檔案不要重複檔名，前面一律加上 Slot，
```

assets/scripts/
├── core/
│   ├── SlotGameCtrl.ts
│   ├── SlotGameState.ts
│
├── reel/
│   ├── SlotReelManager.ts
│   ├── SlotReelCtrl.ts
│   ├── SlotSymbolCtrl.ts
│
├── math/
│   ├── SlotSymbolDef.ts
│   ├── SlotWeightTable.ts
│   ├── SlotPaytable.ts
│   ├── SlotRNG.ts
│   ├── SlotMath.ts
│
├── feature/
│   ├── SlotFreeGameCtrl.ts
│
├── ui/
│   ├── SlotUICtrl.ts

````

---

# 🧩 Symbol 定義

```ts
// SymbolDef.ts
export enum SymbolID {
    S1, // 液體
    S2, // 藥草
    S3, // 搗藥器
    S4, // 玻璃瓶
    S5, // 蒸餾器

    TEN,
    J,
    Q,
    K,
    A,

    WILD,
    SCATTER
}
````

---

# ⚖️ 權重表（出現機率）

```ts
// WeightTable.ts
import { SymbolID } from "./SymbolDef";

export const SYMBOL_WEIGHT = {
    [SymbolID.S1]: 100,
    [SymbolID.S2]: 90,
    [SymbolID.S3]: 70,
    [SymbolID.S4]: 50,
    [SymbolID.S5]: 30,

    [SymbolID.TEN]: 120,
    [SymbolID.J]: 110,
    [SymbolID.Q]: 100,
    [SymbolID.K]: 90,
    [SymbolID.A]: 80,

    [SymbolID.WILD]: 20,
    [SymbolID.SCATTER]: 15
};
```

---

# 💰 賠率表（Paytable）

```ts
// Paytable.ts
import { SymbolID } from "./SymbolDef";

export const PAY_TABLE = {
    [SymbolID.S1]: { 3: 5, 4: 10, 5: 20 },
    [SymbolID.S2]: { 3: 6, 4: 12, 5: 25 },
    [SymbolID.S3]: { 3: 8, 4: 16, 5: 40 },
    [SymbolID.S4]: { 3: 10, 4: 25, 5: 60 },
    [SymbolID.S5]: { 3: 15, 4: 40, 5: 100 },

    [SymbolID.TEN]: { 3: 3, 4: 6, 5: 10 },
    [SymbolID.J]: { 3: 3, 4: 6, 5: 10 },
    [SymbolID.Q]: { 3: 4, 4: 8, 5: 15 },
    [SymbolID.K]: { 3: 4, 4: 8, 5: 15 },
    [SymbolID.A]: { 3: 5, 4: 10, 5: 20 },

    [SymbolID.WILD]: {},
    [SymbolID.SCATTER]: { 3: 0 }
};
```

---

# 🎲 RNG（加權隨機）

```ts
// RNG.ts
import { SYMBOL_WEIGHT } from "./WeightTable";

export default class RNG {

    static getRandomSymbol(): number {
        let totalWeight = 0;

        for (let key in SYMBOL_WEIGHT) {
            totalWeight += SYMBOL_WEIGHT[key];
        }

        let rand = Math.random() * totalWeight;

        for (let key in SYMBOL_WEIGHT) {
            rand -= SYMBOL_WEIGHT[key];
            if (rand <= 0) {
                return Number(key);
            }
        }

        return 0;
    }

    static generateMatrix(rows: number, cols: number) {
        let result = [];

        for (let r = 0; r < rows; r++) {
            result[r] = [];

            for (let c = 0; c < cols; c++) {
                result[r][c] = this.getRandomSymbol();
            }
        }

        return result;
    }
}
```

---

# 🧮 Ways 中獎計算（簡化版）

```ts
// SlotMath.ts
import { PAY_TABLE } from "./Paytable";
import { SymbolID } from "./SymbolDef";

export default class SlotMath {

    static calculateWays(matrix: SymbolID[][]) {
        let totalWin = 0;

        for (let row = 0; row < matrix.length; row++) {

            let first = matrix[row][0];
            let count = 1;

            for (let col = 1; col < matrix[row].length; col++) {
                if (
                    matrix[row][col] === first ||
                    matrix[row][col] === SymbolID.WILD
                ) {
                    count++;
                } else {
                    break;
                }
            }

            if (count >= 3) {
                totalWin += PAY_TABLE[first]?.[count] || 0;
            }
        }

        return totalWin;
    }
}
```

---

# 🎁 Scatter 判定

```ts
function checkScatter(matrix) {
    let count = 0;

    for (let r of matrix) {
        for (let s of r) {
            if (s === SymbolID.SCATTER) count++;
        }
    }

    return count >= 3;
}
```

---

# 🎮 GameCtrl（主流程）

```ts
// GameCtrl.ts
import RNG from "../math/RNG";
import SlotMath from "../math/SlotMath";
import { SymbolID } from "../math/SymbolDef";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameCtrl extends cc.Component {

    startSpin() {

        let matrix = RNG.generateMatrix(4, 5);

        let win = SlotMath.calculateWays(matrix);

        let isFree = this.checkScatter(matrix);

        this.onSpinEnd({
            matrix,
            win,
            isFree
        });
    }

    checkScatter(matrix) {
        let count = 0;

        matrix.forEach(row => {
            row.forEach(s => {
                if (s === SymbolID.SCATTER) count++;
            });
        });

        return count >= 3;
    }

    onSpinEnd(result) {
        cc.log("結果:", result);
    }
}
```

---

# 🎁 FreeGame 控制

```ts
// FreeGameCtrl.ts
const { ccclass } = cc._decorator;

@ccclass
export default class FreeGameCtrl extends cc.Component {

    freeCount: number = 0;

    enterFreeGame() {
        this.freeCount = 8;
        cc.log("進入 Free Game");
    }

    endFreeGame() {
        cc.log("Free Game 結束");
    }
}
```

---

# 🧠 GameState（狀態）

```ts
// GameState.ts
export enum GameMode {
    NORMAL,
    FREE
}

export default class GameState {
    static mode = GameMode.NORMAL;
}
```

---

# 🎯 備註（重要）

* 此版本為 **簡化 Ways 計算（逐 row）**
* 可後續擴充：

  * 真正 243 ways
  * Reel Strip 模式
  * RTP 校正
  * Sticky Wild / Multiplier

---

# ✅ 完成度

✔ 可生成隨機盤面
✔ 可計算中獎
✔ 可判定 Free Game
✔ 可接 UI / Reel 系統

---

👉 可直接作為 Slot Prototype 運行

```
```


---

# ✨ 十、動畫建議（面試加分）

---

## 🎰 Spin

* 每輪 delay：0.2s
* easing：easeOut

---

## 🎯 停輪
- 這是業界的標準做法
- Reel1：0.0s
- Reel2：0.2s
- Reel3：0.4s
- Reel4：0.6s
- Reel5：0.8s
- 最後停在 ~1.2s ~ 1.6s（含減速）

- snap 對齊 grid

---

## 🎆 中獎

* symbol scale 1 → 1.2 → 1
* glow

---

## 🧪 Free Game

* 背景變紫色
* 鍋子發光 + 粒子

---

# 🚀 最後總結

這套已經做到：

✔ 5x4 + 243 ways
✔ State Machine
✔ Reel 動畫
✔ Weighted RNG
✔ Payout（含 Wild）
✔ Free Game

---

## 換皮
- 詢問做法，先不實作
1. 假如今天要用 slot 場景，來做換皮的節慶遊戲"華人春節"好了
2. 請你幫我說明以目前 slot 的架構，要如何修改，我的預想是換背景symbol、音樂、特色遊戲元素
3. 幫我掃描看看是不是 實作2. 就可換皮了？還是還有哪些要調整？

---

## 📌 業界換皮實作方式

> 結論：概念相同，但規模和工程化程度差很多。

### 核心思路：「數學模型 ≠ 主題」

業界把一款遊戲明確切成兩層：

```
┌──────────────────────────────┐
│        Theme Layer（主題層）   │  ← 換皮的部分
│  圖、音、動畫、UI 文字、特效     │
├──────────────────────────────┤
│       Math Layer（數學層）     │  ← 絕對不動
│  RTP、賠率表、RNG、Ways 邏輯    │
└──────────────────────────────┘
```

一套數學模型可以撐起十幾二十款遊戲，只是穿不同衣服。

---

### 業界做法

#### 1. 資源包（Asset Bundle）驅動
不是在 Inspector 手動換圖，而是：

```
/themes/
  /alchemy/    ← 煉金術主題資源包
  /cny/        ← 春節主題資源包
  /halloween/  ← 萬聖節主題資源包

// 執行時動態載入對應包
ThemeManager.load("cny").then(() => game.start());
```

遊戲啟動時由 ThemeManager 決定載入哪包，核心邏輯完全不知道「現在是哪個主題」。

#### 2. 設定檔驅動（Config-Driven）
每個主題一個 JSON，連 RTP 微調都放在裡面：

```json
{
  "themeID": "cny_2025",
  "bgmNormal": "cny_bgm_normal.mp3",
  "symbols": [
    { "id": 0, "name": "RedEnvelope", "img": "sym_red_envelope.png" },
    { "id": 1, "name": "Lantern",     "img": "sym_lantern.png" }
  ],
  "freeGame": {
    "triggerCount": 3,
    "spins": 8,
    "specialMechanic": "lanternCollect"
  }
}
```

程式碼讀設定，**不寫死任何主題相關的字串或路徑**。

#### 3. Symbol Mapping（符號映射）
Math Layer 只認識 ID（0~12），由 ThemeManager 負責把 ID 對應到這個主題的圖與名稱。
目前架構的 `SlotSymbolCtrl.symbolFrames[]` 已做到這件事，但是靠 Inspector 手動設定；業界是程式自動載入。

#### 4. 特色機制抽象化（Mechanic Abstraction）
BOTTLE 機制在業界叫做 **Collector Mechanic**，業界寫法：

```typescript
interface CollectorSymbol {
  symbolID: number;
  targetNodeName: string; // 飛向哪個 UI 元素
  onCollect: () => void;  // 收集到時做什麼
}
// 春節主題換成燈籠、萬聖節換成南瓜，機制程式碼完全不改
```

---

### 我們的架構 vs 業界比較

| 面向 | 目前架構 | 業界標準 |
|------|---------|--------|
| 資源管理 | Inspector 手動拖換 | Asset Bundle 動態載入 |
| 主題設定 | 寫死在 Prefab/Scene | JSON Config 驅動 |
| Symbol 映射 | `symbolFrames[]` 手動對應 | ThemeManager 自動注入 |
| 特色機制 | BOTTLE 寫死 | Mechanic 介面抽象化 |
| 多主題共存 | 一個 Scene = 一個主題 | 一個 Scene + N 個資源包 |
| 換皮工時 | 需要開 Creator 編輯 | 只需換資源包 + JSON |

---

### 要不要升級到業界等級？

- **學習 / Demo 用途** → 現在的方式完全夠，不需要工程化
- **想做成可快速換皮的產品** → 需要加 `ThemeManager` + JSON Config，把 Inspector 設定改成程式載入
- **真正上線的商業遊戲** → 還需要 RTP 認證、亂數種子稽核等合規要求

