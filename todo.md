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

---

## 🛠 技術實作總結紀錄 (Technical Summary)

### 1. btn_spain 的「長按粒子特效 (New Particle)」實作
- **技術原理**：捨棄了原生的 `cc.Button` click 事件，改為監聽底層的 `TOUCH_START` 與 `TOUCH_END` / `TOUCH_CANCEL`。
- **長按判斷**：按下時透過 `setTimeout` 計時 0.5 秒。若時間到還沒放開，則判定為長按。
- **粒子特效 (Particle System)**：
  - 觸發長按時，呼叫 `this.spinParticle.resetSystem()`，讓粒子（猶如聚氣效果的星星噴發）瞬間播放，增強玩家的回饋打擊感。
  - 當手紙放開時（`TOUCH_END`），呼叫 `stopSystem()` 讓特效自然消散。
  - **優勢**：相較於原本單調的按鈕縮放縮放，粒子系統提供了零死角的高幀數動畫，媲美市面真正的商業老虎機遊戲體驗。
  
  **相關程式碼 (節錄自 `GameManager.ts`)**：
  ```typescript
  // 綁定觸控事件
  this.btn_spinNode.on(cc.Node.EventType.TOUCH_START, this.onSpinTouchStart, this);
  this.btn_spinNode.on(cc.Node.EventType.TOUCH_END, this.onSpinTouchEnd, this);
  
  onSpinTouchStart() {
    this.longPressTimeout = setTimeout(() => {
      this.isLongPress = true;
      if (this.spinParticle) {
        this.spinParticle.resetSystem(); // 引爆粒子聚氣特效！
      }
      // ...啟動自動旋轉選單
    }, 500);
  }
  
  onSpinTouchEnd() {
    clearTimeout(this.longPressTimeout);
    if (this.spinParticle) {
      this.spinParticle.stopSystem(); // 關閉粒子特效
    }
  }
  ```

### 2. 關於 WebView 與遊戲內網頁顯示
#### 2.1 載入本地網頁與 JS Bridge 通訊機制
- **處理 404 問題**：在 Cocos 電腦版「預覽模式」下，填寫相對路徑容易導致找不到檔案。我們使用 `cc.TextAsset` 將 `rules.html` 當作純文字讀入，再轉換為 `data:text/html;charset=utf-8` 的 Data URI 餵給 WebView，保證 100% 成功讀取且不受路徑限制。
- **網頁按鈕關閉遊戲內 WebView (雙軌通訊機制)**：
  - **Native/App 模式**：利用引擎內建的 `setJavascriptInterfaceScheme("cocos")`，只要 HTML 去戳 `href="cocos://close"`，遊戲層 `setOnJSCallback` 就會精準攔截。
  - **Web 預覽模式**：因為電腦瀏覽器會阻擋未知的 `cocos://` 協定，所以我們在 HTML 按鈕並用了 `window.parent.postMessage('cocos_close', '*')`；同時在 `UIController.ts` 使用 `window.addEventListener('message')` 接收，達成完美跨平台橋接。

  **相關程式碼 (WebView 通訊實作)**：
  
  *1. 網頁端 (節錄自 `rules.html`)*：
  ```html
  <a href="javascript:void(0)" onclick="closeCocos()" class="close-btn">✖</a>
  <script>
    function closeCocos() {
      // 1. 發送 Web 專用的 postMessage (給網頁預覽版使用)
      if (window.parent) window.parent.postMessage('cocos_close', '*');
      
      // 2. 觸發 Native 手機專用的 URL Scheme (給手機打包版使用)
      window.location.href = "cocos://close";
    }
  </script>
  ```
  
  *2. 遊戲端 (節錄自 `UIController.ts`)*：
  ```typescript
  onLoad() {
    // 專門抓取電腦 Web 預覽模式下的 postMessage
    if (cc.sys.isBrowser) {
      window.addEventListener('message', (event) => {
        if (event.data === 'cocos_close') this.hideInfo();
      });
    }
  }

  showInfo() {
    this.node_webViewInfo.active = true;
    
    // 載入本地 HTML 並轉換為 Data URI 解決本地開發的 404 問題
    this.webView.url = "data:text/html;charset=utf-8," + encodeURIComponent(this.rulesHtmlFile.text);
    
    // 專門抓取 Native App 專用的 Scheme 協定
    this.webView.setJavascriptInterfaceScheme("cocos");
    this.webView.setOnJSCallback((target: cc.WebView, url: string) => {
      if (url === "cocos://close") this.hideInfo();
    });
  }
  ```

#### 2.2 若未來將 GameRule 部署到遠端 (Remote Server) 的注意事項
- **怎麼使用**：只要將 `rules.html` 上傳到雲端，在 Cocos 的 `this.webView.url` 改塞絕對網址 (如 `https://example.com/rules.html`) 即可立刻生效，這也有利於未來「不更新遊戲本體，就能遠端抽換賠率說明」。
- **跨域問題 (CORS / Cross-Origin)**：
  - **手機 App 端**：打包成 iOS/Android 後，使用 `setJavascriptInterfaceScheme` 協定本身就是 Native 攔截，**沒有跨域問題**！
  - **H5 網頁遊戲版**：如果你的遊戲放在 `A.com`，網頁放在 `B.com`，這時 HTML 裡的 `window.parent.postMessage` 很容易被瀏覽器以安全理由阻擋。
  - **跨域解決方案**：
    1. **同源部署**：盡量將 `rules.html` 跟遊戲產出的 `index.html` 放在同一個網域下。
    2. **指定白名單**：在 `postMessage("cocos_close", "https://你的遊戲域名.com")` 中綁定確切的遊戲域名，並且在遠端伺服器 (如 Nginx 或 S3) 為那份 HTML 設定 Header `Access-Control-Allow-Origin: *`。
    3. **避免蓋版**：若 H5 跨域實在搞不定，業界有時會放棄 `cc.WebView`，改用 Cocos 內建的 `cc.RichText` + `cc.ScrollView` 來純手工刻畫文字。