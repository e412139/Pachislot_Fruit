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

## log
```bash
[Debug] load __quick_compile_project__: 7.610ms (__quick_compile__.js, line 227)
[Debug] eval __quick_compile_project__ : 9 files: 0.894ms (__quick_compile__.js, line 244)
[Log] Cocos Creator v2.4.15 (cocos2d-js-for-preview.js, line 18613)
[Log] ✅ Symbol – 0 – "set to type:" – 2
[Log] ✅ Symbol – 1 – "set to type:" – 1
[Log] ✅ Symbol – 2 – "set to type:" – 3
[Log] ✅ Symbol – 3 – "set to type:" – 3
[Log] ✅ Symbol – 4 – "set to type:" – 0
[Log] ✅ Symbol – 0 – "set to type:" – 2
[Log] ✅ Symbol – 1 – "set to type:" – 2
[Log] ✅ Symbol – 2 – "set to type:" – 2
[Log] ✅ Symbol – 3 – "set to type:" – 0
[Log] ✅ Symbol – 4 – "set to type:" – 3
[Log] ✅ Symbol – 0 – "set to type:" – 3
[Log] ✅ Symbol – 1 – "set to type:" – 3
[Log] ✅ Symbol – 2 – "set to type:" – 3
[Log] ✅ Symbol – 3 – "set to type:" – 0
[Log] ✅ Symbol – 4 – "set to type:" – 3
> spain
< ReferenceError: Can't find variable: spain
[Log] 🎰 onSpinClick() called, current state: – 0
[Log] 🎬 startSpin() called
[Log] 🎲 spinResult: – [[1, 3, 2], [2, 1, 2], [4, 0, 0]] (3)
[Log] 🔄 Reel.spin() called (x3)
[Log] 🎯 Recycled symbol, rotationCount: 1, new symbol: 2 (x2)
[Log] 🎯 Recycled symbol, rotationCount: 1, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 2, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 2, new symbol: 2 (x2)
[Log] 🎯 Recycled symbol, rotationCount: 3, new symbol: 2
[Log] 🎯 Recycled symbol, rotationCount: 3, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 3, new symbol: 0
[Log] 🎯 Recycled symbol, rotationCount: 4, new symbol: 3 (x3)
[Log] 🎯 Recycled symbol, rotationCount: 5, new symbol: 2
[Log] 🎯 Recycled symbol, rotationCount: 5, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 5, new symbol: 0
[Log] 🎯 Recycled symbol, rotationCount: 6, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 6, new symbol: 0
[Log] 🎯 Recycled symbol, rotationCount: 6, new symbol: 3
[Log] 🎯 Recycled symbol, rotationCount: 7, new symbol: 2 (x2)
[Log] 🎯 Recycled symbol, rotationCount: 7, new symbol: 0
[Log] 🎯 Recycled symbol, rotationCount: 8, new symbol: 2
[Log] 🎯 Recycled symbol, rotationCount: 8, new symbol: 0
[Log] 🎯 Recycled symbol, rotationCount: 8, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 9, new symbol: 0
[Log] 🎯 Recycled symbol, rotationCount: 9, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 9, new symbol: 3
[Log] 🎯 Recycled symbol, rotationCount: 10, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 10, new symbol: 3
[Log] 🎯 Recycled symbol, rotationCount: 10, new symbol: 1
[Log] 🛑 stopReels() called
[Log] 📌 Scheduling stop for reel 0 with target: – [1, 3, 2] (3)
[Log] 📌 Scheduling stop for reel 1 with target: – [2, 1, 2] (3)
[Log] 📌 Scheduling stop for reel 2 with target: – [4, 0, 0] (3)
[Log] 🛑 Reel.stop() called with target: – [1, 3, 2] (3)
[Log] 🎯 Recycled symbol, rotationCount: 11, new symbol: 0
[Log] 🎯 Recycled symbol, rotationCount: 11, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 12, new symbol: 0 (x2)
[Log] 🎯 Recycled symbol, rotationCount: 13, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 13, new symbol: 2
[Log] 🛑 tryStop() aligned, node.y: – -7.105427357601002e-15
[Log] 📍 alignToResult() called!
[Log] 📍 targetSymbols: – [1, 3, 2] (3)
[Log] 📍 rotationCount: – 14
[Log] 📍 symbols array length: – 5
[Log]   [i=0] symbolIndex=0, targetSymbol=1
[Log]     ✅ Setting symbolComp.setSymbol(1)
[Log]     ✅ Symbol label after set: B
[Log]   [i=1] symbolIndex=1, targetSymbol=3
[Log]     ✅ Setting symbolComp.setSymbol(3)
[Log]     ✅ Symbol label after set: D
[Log]   [i=2] symbolIndex=2, targetSymbol=2
[Log]     ✅ Setting symbolComp.setSymbol(2)
[Log]     ✅ Symbol label after set: C
[Log] 📍 alignToResult() completed!
[Log] ✅ Reel stopped at y: – -7.105427357601002e-15
[Log] 🎯 Recycled symbol, rotationCount: 14, new symbol: 3
[Log] 🎯 Recycled symbol, rotationCount: 14, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 15, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 15, new symbol: 0
[Log] 🛑 Reel.stop() called with target: – [2, 1, 2] (3)
[Log] 🛑 tryStop() aligned, node.y: – -7.105427357601002e-15
[Log] 📍 alignToResult() called!
[Log] 📍 targetSymbols: – [2, 1, 2] (3)
[Log] 📍 rotationCount: – 16
[Log] 📍 symbols array length: – 5
[Log]   [i=0] symbolIndex=2, targetSymbol=2
[Log]     ✅ Setting symbolComp.setSymbol(2)
[Log]     ✅ Symbol label after set: C
[Log]   [i=1] symbolIndex=3, targetSymbol=1
[Log]     ✅ Setting symbolComp.setSymbol(1)
[Log]     ✅ Symbol label after set: B
[Log]   [i=2] symbolIndex=4, targetSymbol=2
[Log]     ✅ Setting symbolComp.setSymbol(2)
[Log]     ✅ Symbol label after set: C
[Log] 📍 alignToResult() completed!
[Log] ✅ Reel stopped at y: – -7.105427357601002e-15
[Log] 🎯 Recycled symbol, rotationCount: 16, new symbol: 2
[Log] 🎯 Recycled symbol, rotationCount: 17, new symbol: 3
[Log] 🎯 Recycled symbol, rotationCount: 18, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 19, new symbol: 1
[Log] 🎯 Recycled symbol, rotationCount: 20, new symbol: 1
[Log] 🛑 Reel.stop() called with target: – [4, 0, 0] (3)
[Log] 🛑 tryStop() aligned, node.y: – -0.6000000000000085
[Log] 📍 alignToResult() called!
[Log] 📍 targetSymbols: – [4, 0, 0] (3)
[Log] 📍 rotationCount: – 21
[Log] 📍 symbols array length: – 5
[Log]   [i=0] symbolIndex=2, targetSymbol=4
[Log]     ✅ Setting symbolComp.setSymbol(4)
[Log]     ✅ Symbol label after set: W
[Log]   [i=1] symbolIndex=3, targetSymbol=0
[Log]     ✅ Setting symbolComp.setSymbol(0)
[Log]     ✅ Symbol label after set: A
[Log]   [i=2] symbolIndex=4, targetSymbol=0
[Log]     ✅ Setting symbolComp.setSymbol(0)
[Log]     ✅ Symbol label after set: A
[Log] 📍 alignToResult() completed!
[Log] ✅ Reel stopped at y: – -0.6000000000000085
```

## 備註
- 使用中文說明與解說實作