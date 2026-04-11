## 問題
1. tdtest bigwin megawin 都是顯示 "super win" 動畫，該該顯示對應的動畫字圖
2. pot 冒煙的位子不對，應該要從 pot 的中間冒出來，而不是從 pot 的下方冒出來
3. 進入 free game 先不顯示大獎動畫，的執行以下內容
    3.1 先讓  scstter 做順時鐘旋轉兩圈的動畫持續1.5秒
    3.2 應該要顯示 恭喜進入 free game layout 的背景圖 1.5 秒
    3.3 再顯示 free game 場景
    3.4 free game 8 局結束後再顯示 "大獎動畫"
    3.5 最後回到一般 normal 場景  
4. 引導我 node_ slotUICtrl 需要掛的節點內容是什麼？
5. 前他實作時否符合上述內容


## 新需求
1. 在 free game(fg) 遊戲期間，我感覺有點單調，我想在 free game 加一個空瓶 symbol，8 局 fg 中 只要出現“空瓶” symbol，就 +1 倍數，起始值為 x2 如果 8 局中出現 3 個空瓶，則 x2 + 3 = x5，出現空瓶時會有飛向 x2 的動畫，每飛向一次 就顯示 +1 的動畫，最後顯示 total win : 分數 x 5 Layout 畫面

## 實作`
- 一項項按順序修改