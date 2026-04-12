import base64
import os

def get_b64(name):
    p = f'assets/Texture/slot/{name}.png'
    if not os.path.exists(p): return ''
    with open(p, 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')

html_content = f'''<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes">
    <title>Alchemy Slot 遊戲規則</title>
    <style>
        :root {{
            --primary: #f1c40f;
            --secondary: #9b59b6;
            --accent: #e74c3c;
            --bg: #0f0c29;
            --bg-gradient: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            --card-bg: rgba(255, 255, 255, 0.08);
            --text: #ffffff;
            --text-dim: rgba(255, 255, 255, 0.85);
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg-gradient);
            color: var(--text);
            overflow-x: hidden;
            width: 100vw;
            height: 100vh;
            touch-action: pan-y;
        }}
        .container {{
            display: flex;
            width: 400%; /* 四個頁面 */
            height: 100%;
            transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
        }}
        .page {{
            width: 25%;
            height: 100%;
            padding: 30px 40px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            display: flex;
            flex-direction: column;
            align-items: center;
        }}
        h1 {{
            font-size: 30px;
            color: var(--primary);
            margin-bottom: 25px;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 0 0 15px rgba(241, 196, 15, 0.5);
            text-align: center;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 15px;
            width: 100%;
        }}
        .card {{
            background: var(--card-bg);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            padding: 25px;
            width: 100%;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }}
        p {{ font-size: 18px; line-height: 1.6; color: var(--text-dim); margin-bottom: 12px; }}
        strong {{ color: var(--primary); font-size: 1.1em; }}

        /* Ways Diagram 組件 */
        .diagram-container {{
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 6px;
            margin: 20px 0;
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 12px;
        }}
        .grid-cell {{
            width: 50px;
            height: 45px;
            background: rgba(255,255,255,0.05);
            border-radius: 6px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 12px;
        }}
        .grid-cell.active {{
            background: var(--primary);
            box-shadow: 0 0 15px var(--primary);
            color: black;
            font-weight: bold;
            animation: pulse 1.5s infinite;
        }}
        @keyframes pulse {{
            0% {{ opacity: 0.6; }}
            50% {{ opacity: 1; }}
            100% {{ opacity: 0.6; }}
        }}

        /* 賠率列表 (改為單直列) */
        .paytable {{
            display: flex;
            flex-direction: column;
            gap: 20px;
            width: 100%;
        }}
        .sym-card {{
            display: flex;
            align-items: center;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 20px;
            text-align: left;
            transition: transform 0.2s;
        }}
        .sym-card:active {{ transform: scale(0.98); }}
        .sym-img {{ width: 90px; height: 90px; margin-right: 25px; flex-shrink: 0; filter: drop-shadow(0 0 8px rgba(255,255,255,0.2)); }}
        .sym-info {{ flex-grow: 1; }}
        .sym-name {{ font-weight: bold; font-size: 22px; display: block; margin-bottom: 6px; color: var(--primary); }}
        .sym-vals {{ font-size: 18px; color: var(--text); line-height: 1.5; font-weight: 500; }}

        /* 特殊玩法區塊 */
        .feat-box {{
            display: flex;
            align-items: center;
            gap: 25px;
            margin-bottom: 25px;
            background: rgba(255,255,255,0.04);
            padding: 25px;
            border-radius: 20px;
            border: 1px solid rgba(255,255,255,0.1);
        }}
        .feat-img {{ width: 100px; flex-shrink: 0; }}
        .feat-txt h3 {{ color: var(--primary); margin-bottom: 10px; font-size: 24px; text-shadow: 0 0 10px rgba(255,255,255,0.2); }}
        .feat-txt p {{ font-size: 18px; margin: 0; color: #fff; }}

        /* 導航 */
        .dots {{
            position: fixed;
            bottom: 25px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            gap: 12px;
            z-index: 200;
        }}
        .dot {{ width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.2); transition: all 0.3s; }}
        .dot.active {{ width: 25px; background: var(--primary); border-radius: 5px; box-shadow: 0 0 10px var(--primary); }}

        .arrow {{
            position: fixed;
            top: 50%;
            transform: translateY(-50%);
            width: 45px;
            height: 70px;
            background: rgba(0,0,0,0.4);
            color: var(--primary);
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 40px;
            z-index: 100;
            border-radius: 10px;
            transition: all 0.3s;
            cursor: pointer;
        }}
        .arrow:active {{ background: var(--primary); color: white; }}
        .arrow-left {{ left: 5px; }}
        .arrow-right {{ right: 5px; }}
        .arrow.hide {{ opacity: 0; pointer-events: none; }}

        .btnClose {{
            position: fixed;
            top: 20px;
            right: 20px;
            width: 45px;
            height: 45px;
            background: rgba(243, 156, 18, 0.8);
            color: white;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 24px;
            text-decoration: none;
            z-index: 300;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }}

        .click-area {{ position: fixed; top: 0; width: 20%; height: 100%; z-index: 50; }}
    </style>
</head>
<body>
    <a href="cocos://close" class="btnClose" onclick="window.parent.postMessage('cocos_close', '*')">✕</a>
    
    <div class="dots" id="dots">
        <div class="dot active"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    </div>

    <div class="arrow arrow-left hide" id="arrowL" onclick="prevPage()">‹</div>
    <div class="arrow arrow-right" id="arrowR" onclick="nextPage()">›</div>

    <div class="click-area" style="left:0;" onclick="prevPage()"></div>
    <div class="click-area" style="right:0;" onclick="nextPage()"></div>

    <div class="container" id="container">
        <!-- Page 1: 1024 Ways 解密 -->
        <div class="page">
            <h1>1024 Ways 解密</h1>
            <div class="card">
                <p>這是一個 5x4 盤面，打破傳統「線」的束縛。只要相同的符號從<strong>第一輪向右連續出現</strong>，即為中獎！</p>
                
                <div style="text-align:center; margin-top:10px; font-size:14px;"><strong>連線計算範例：</strong></div>
                <div class="diagram-container">
                    <div class="grid-cell active">S1</div><div class="grid-cell"></div><div class="grid-cell"></div><div class="grid-cell"></div><div class="grid-cell"></div>
                    <div class="grid-cell active">S1</div><div class="grid-cell active">S1</div><div class="grid-cell active">S1</div><div class="grid-cell"></div><div class="grid-cell"></div>
                    <div class="grid-cell"></div><div class="grid-cell"></div><div class="grid-cell active">S1</div><div class="grid-cell"></div><div class="grid-cell"></div>
                    <div class="grid-cell"></div><div class="grid-cell"></div><div class="grid-cell"></div><div class="grid-cell"></div><div class="grid-cell"></div>
                </div>
                <p style="font-size:13px; text-align:center; margin-top:10px;">
                  第1輪(2個) × 第2輪(1個) × 第3輪(2個) = <br><strong style="font-size:16px;">4 Ways 中獎！</strong>
                </p>
            </div>
            <p style="font-size:14px; text-align:center; color:var(--primary); animation: pulse 2s infinite;">⬅️ 左右滑動或點擊邊緣查看細節 ➡️</p>
        </div>

        <!-- Page 2: 高賠率符號 -->
        <div class="page">
            <h1>煉金珍寶 (高賠率)</h1>
            <div class="paytable">
                <div class="sym-card"><img src="{get_b64('s1')}" class="sym-img"><div class="sym-info"><span class="sym-name">S1 (藥水)</span><div class="sym-vals">5連: 100x | 4連: 40x | 3連: 15x</div></div></div>
                <div class="sym-card"><img src="{get_b64('s2')}" class="sym-img"><div class="sym-info"><span class="sym-name">S2 (蒸餾器)</span><div class="sym-vals">5連: 60x | 4連: 25x | 3連: 10x</div></div></div>
                <div class="sym-card"><img src="{get_b64('s3')}" class="sym-img"><div class="sym-info"><span class="sym-name">S3 (研磨缽)</span><div class="sym-vals">5連: 40x | 4連: 16x | 3連: 8x</div></div></div>
                <div class="sym-card"><img src="{get_b64('s4')}" class="sym-img"><div class="sym-info"><span class="sym-name">S4 (魔法秘方)</span><div class="sym-vals">5連: 25x | 4連: 12x | 3連: 6x</div></div></div>
                <div class="sym-card"><img src="{get_b64('s5')}" class="sym-img"><div class="sym-info"><span class="sym-name">S5 (藥草)</span><div class="sym-vals">5連: 20x | 4連: 10x | 3連: 5x</div></div></div>
                <div class="sym-card"><img src="{get_b64('wild')}" class="sym-img"><div class="sym-info"><span class="sym-name">WILD</span><div class="sym-vals">萬能替代符號 (除 Scatter 外)</div></div></div>
            </div>
        </div>

        <!-- Page 3: 基礎符號 -->
        <div class="page">
            <h1>魔法符文 (基礎)</h1>
            <div class="paytable">
                <div class="sym-card"><img src="{get_b64('A')}" class="sym-img"><div class="sym-info"><span class="sym-name">A</span><div class="sym-vals">5連: 20x | 4連: 10x | 3連: 5x</div></div></div>
                <div class="sym-card"><img src="{get_b64('K')}" class="sym-img"><div class="sym-info"><span class="sym-name">K</span><div class="sym-vals">5連: 15x | 4連: 8x | 3連: 4x</div></div></div>
                <div class="sym-card"><img src="{get_b64('Q')}" class="sym-img"><div class="sym-info"><span class="sym-name">Q</span><div class="sym-vals">5連: 15x | 4連: 8x | 3連: 4x</div></div></div>
                <div class="sym-card"><img src="{get_b64('J')}" class="sym-img"><div class="sym-info"><span class="sym-name">J</span><div class="sym-vals">5連: 10x | 4連: 6x | 3連: 3x</div></div></div>
                <div class="sym-card"><img src="{get_b64('10')}" class="sym-img"><div class="sym-info"><span class="sym-name">10</span><div class="sym-vals">5連: 10x | 4連: 6x | 3連: 3x</div></div></div>
            </div>
        </div>

        <!-- Page 4: 特殊玩法 -->
        <div class="page">
            <h1>傳奇玩法</h1>
            <div class="card">
                <div class="feat-box">
                    <img src="{get_b64('SCSTTER2')}" class="feat-img">
                    <div class="feat-txt">
                        <h3>FREE GAMES</h3>
                        <p>第 1, 3, 5 輪同時出現 Scatter，立即觸發 <strong>8 局免費遊戲</strong>！</p>
                    </div>
                </div>
                <div class="feat-box">
                    <img src="{get_b64('bottle')}" class="feat-img">
                    <div class="feat-txt">
                        <h3>煉金倍率 (重要)</h3>
                        <p>FG 期間出現「空瓶」，每瓶使當局總贏分 <strong>倍數 +1</strong>。倍數無限累積！</p>
                    </div>
                </div>
                <p style="text-align:center; margin-top:20px; color:var(--primary); font-weight:bold; font-size:18px;">祝您大獲全勝！</p>
            </div>
        </div>
    </div>

    <script>
        const container = document.getElementById('container');
        const dots = document.getElementById('dots').children;
        const arrowL = document.getElementById('arrowL');
        const arrowR = document.getElementById('arrowR');
        let currentIdx = 0;
        const totalPages = 4;
        let startX = 0;

        function updatePage() {{
            container.style.transform = `translateX(-${{currentIdx * 25}}%)`;
            Array.from(dots).forEach((dot, i) => dot.classList.toggle('active', i === currentIdx));
            arrowL.classList.toggle('hide', currentIdx === 0);
            arrowR.classList.toggle('hide', currentIdx === totalPages - 1);
        }}

        function nextPage() {{ if (currentIdx < totalPages - 1) {{ currentIdx++; updatePage(); }} }}
        function prevPage() {{ if (currentIdx > 0) {{ currentIdx--; updatePage(); }} }}

        container.addEventListener('touchstart', e => startX = e.touches[0].clientX, {{passive:true}});
        container.addEventListener('touchend', e => {{
            let diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) diff > 0 ? nextPage() : prevPage();
        }});
        container.addEventListener('mousedown', e => startX = e.clientX);
        container.addEventListener('mouseup', e => {{
            let diff = startX - e.clientX;
            if (Math.abs(diff) > 50) diff > 0 ? nextPage() : prevPage();
        }});

        Array.from(dots).forEach((dot, i) => dot.onclick = () => {{ currentIdx = i; updatePage(); }});
    </script>
</body>
</html>'''

with open('assets/html/slot_rules.html', 'w', encoding='utf-8') as f:
    f.write(html_content)
