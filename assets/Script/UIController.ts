const { ccclass, property } = cc._decorator;

@ccclass
export default class UIController extends cc.Component {

  @property(cc.Label)
  scoreLabel: cc.Label = null;

  @property(cc.Node)
  node_webViewInfo: cc.Node = null; // 整個說明介面節點

  @property(cc.TextAsset)
  rulesHtmlFile: cc.TextAsset = null; // 我們剛寫好的本地網頁檔

  @property(cc.WebView)
  webView: cc.WebView = null; // 負責顯示網頁的元件

  updateScore(value: number) {
    this.scoreLabel.string = `Score: ${value.toLocaleString()}`;
  }

  playWin() {
    cc.log("WIN!");
  }

  // ==== 說明介面 (Info Webview) 控制 ====

  onLoad() {
    // 監聽 Web 平台的 postMessage (因為 Cocos 在預覽模式下是用 iframe 渲染 WebView)
    if (cc.sys.isBrowser) {
      window.addEventListener('message', (event) => {
        if (event.data === 'cocos_close') {
          this.hideInfo();
        }
      });
    }
  }

  showInfo() {
    if (this.node_webViewInfo) {
      this.node_webViewInfo.active = true;
    }

    // 將本地端 HTML 轉換為 WebView 必定吃得到的 Data URI 格式，解決 404 找不到檔案的問題
    if (this.webView && this.rulesHtmlFile) {
      // 1. 註冊 JS Bridge 監聽 Scheme
      this.webView.setJavascriptInterfaceScheme("cocos");

      // 2. 註冊 Callback，當網頁內有 href="cocos://..." 時會觸發
      this.webView.setOnJSCallback((target: cc.WebView, url: string) => {
        if (url === "cocos://close") {
          this.hideInfo();
        }
      });

      // 3. 載入網頁
      this.webView.url = "data:text/html;charset=utf-8," + encodeURIComponent(this.rulesHtmlFile.text);
    }
  }

  hideInfo() {
    if (this.node_webViewInfo) {
      this.node_webViewInfo.active = false;
    }
  }
}