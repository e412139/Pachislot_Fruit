// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;

@ccclass
export default class CoinSpawner extends cc.Component {

    @property(cc.Prefab)
    coinPrefab: cc.Prefab = null;

    private pool = new cc.NodePool();

    spawnBurst(count: number = 20) {
        for (let i = 0; i < count; i++) {
            this.spawnOne();
        }
    }

    spawnBurstSequence() {
        this.unscheduleAllCallbacks();

        let wave = 0;

        this.schedule(() => {
            // 每波越來越多
            let count = 10 + wave * 5;

            this.spawnBurst(count);
            wave++;

        }, 0.08, 6); // 更快、更密集
    }

    spawnOne() {
        let coin = this.pool.size() > 0
            ? this.pool.get()
            : cc.instantiate(this.coinPrefab);

        coin.parent = this.node;

        // ⭐ 隨機起點（不要都從中心）
        let startX = (Math.random() - 0.5) * 100;
        let startY = (Math.random() - 0.5) * 100;

        coin.setPosition(startX, startY);

        // 🎯 更激烈方向
        let angle = Math.random() * Math.PI * 2;

        let speed = 400 + Math.random() * 400; // ⭐ 加速

        let targetX = Math.cos(angle) * speed;
        let targetY = Math.sin(angle) * speed;

        // ⭐ 更高拋物線
        let midY = targetY + 200 + Math.random() * 100;

        coin.opacity = 255;
        coin.scale = 0.5 + Math.random() * 0.8;

        coin.angle = Math.random() * 360;

        cc.tween(coin)
            .parallel(
                // 🎬 拋物線
                cc.tween()
                    .to(0.3, { x: targetX * 0.5, y: midY })
                    .to(0.5, { x: targetX, y: targetY }),

                // 🔄 旋轉（更快）
                cc.tween()
                    .by(0.8, { angle: 720 }),

                // ✨ 透明度
                cc.tween()
                    .delay(0.5)
                    .to(0.3, { opacity: 0 }),

                // 🔥 scale 微變化（更有生命感）
                cc.tween()
                    .to(0.2, { scale: coin.scale * 1.2 })
                    .to(0.6, { scale: coin.scale })
            )
            .call(() => {
                coin.removeFromParent();
                this.pool.put(coin);
            })
            .start();
    }
}
