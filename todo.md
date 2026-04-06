# 幫我用 cocos creator 2.x + typescript 實作 slot machine：

## 需求：
- 3 reel
- state machine（IDLE / SPINNING / RESULT）
- reel 平滑滾動 + 停止對齊
- weighted random
- payout system（含 wild）
- UI（spin / credit / win）

## 架構：
GameManager / Reel / RNG / Payout / UI 分離
  ```bash
  GameManager
   ├── StateMachine
   ├── ReelManager
   │    ├── Reel (x3)
   │    └── SymbolController
   ├── RNGService
   ├── PayoutService
   └── UIController
   ```

## 要求：
- 使用 node pool
- 使用 tween 或 update 控制動畫
- code 要模組化
- 測試模式(方便測試人員測試)
  1. 建置一鍵按下中個特定的獎
  2. 建置 中獎 符號 A、B、C、D 按鈕點下即可觸發中獎動畫與得分(模擬玩家中獎情形)
  3. 跟我說明建置的按鈕要拖到哪個腳本進行執行？
- 接下來 每次都需要手動按下  btn_spain 觸發 onSpinClick ，實在有點累 能不能"長按"按鈕跳出 選擇"連續spin次數"選單
  1. 按鈕該怎麼長按跳出選單？
  2. 選單的製作 prefab  ?
  3. 圖片看起來有按下有厲害的動畫該怎麼做？
      3.1 單張圖簡陋版
      3.2 多張圖
幫我擬定計劃 
## 備註
- 使用中文說明與解說實作