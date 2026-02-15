# Issue #10: L2-TASK-010 动画特效开发

## 任务类型
开发任务（Development）

## 优先级
P1 - 中优先级

## 负责角色
前端开发

## 任务描述

实现游戏动画特效，包括食物呼吸动画、吃食物粒子特效、界面淡入动画等，提升游戏视觉反馈和沉浸感。

## 依赖关系
- 依赖：#7（PRD 文档）、#9（核心 UI 优化）
- 前置任务：#9
- 后续任务：#11（整体测试）

## 验收标准

- [ ] 食物有缩放呼吸动画（半径 6-10px，周期 1 秒）
- [ ] 食物为渐变填充（中心 `#ff6b6b` 到边缘 `#ee5a52`）
- [ ] 吃到食物时有粒子扩散特效（6-8 个小圆点）
- [ ] 粒子向外扩散并淡出（持续 300ms）
- [ ] 游戏结束界面淡入效果（透明度 0 → 1，持续 300ms）
- [ ] 所有动画流畅，帧率稳定（60fps）
- [ ] 粒子系统不影响游戏性能

## 实施步骤

### 1. 新增 ParticleSystem 模块（game.js）

在 `// ========== Renderer 模块 ==========` 之前添加：

```javascript
// ========== ParticleSystem 模块 ==========

const ParticleSystem = {
    /** @type {Array<{x: number, y: number, vx: number, vy: number, alpha: number, life: number}>} */
    particles: [],
    
    /**
     * 在指定位置生成粒子
     * @param {number} gridX - 网格 X 坐标
     * @param {number} gridY - 网格 Y 坐标
     * @returns {void}
     */
    spawn(gridX, gridY) {
        const centerX = gridX * CELL_SIZE + CELL_SIZE / 2;
        const centerY = gridY * CELL_SIZE + CELL_SIZE / 2;
        const count = 6 + Math.floor(Math.random() * 3); // 6-8 个粒子
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 2 + Math.random() * 2; // 2-4 px/frame
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                life: 15 // 15 帧 ≈ 300ms (at 60fps)
            });
        }
    },
    
    /**
     * 更新所有粒子状态
     * @returns {void}
     */
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.alpha = p.life / 15; // 线性淡出
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    },
    
    /**
     * 渲染所有粒子
     * @param {CanvasRenderingContext2D} ctx
     * @returns {void}
     */
    render(ctx) {
        this.particles.forEach(p => {
            ctx.fillStyle = `rgba(255, 107, 107, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    },
    
    /**
     * 清空所有粒子
     * @returns {void}
     */
    clear() {
        this.particles = [];
    }
};
```

### 2. 修改 Renderer.drawFood()（game.js）

```javascript
/**
 * 绘制食物（带呼吸动画和渐变）
 * @param {{x: number, y: number}} position
 * @param {number} timestamp - 当前时间戳（毫秒）
 * @returns {void}
 */
drawFood(position, timestamp) {
    const ctx = this.ctx;
    const centerX = position.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = position.y * CELL_SIZE + CELL_SIZE / 2;
    
    // 呼吸动画：半径 6-10px
    const radius = 8 + 2 * Math.sin(timestamp / 500);
    
    // 渐变填充
    const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius
    );
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(1, '#ee5a52');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
}
```

### 3. 修改 Game 模块添加时间戳和动画（game.js）

在 `Game` 对象中添加：

```javascript
const Game = {
    state: GameState.READY,
    loopTimer: null,
    scoreEl: null,
    highScoreEl: null,
    animationFrameId: null, // 新增：动画帧 ID
    gameOverAlpha: 0,       // 新增：游戏结束界面透明度
    
    // ... 其他方法 ...
    
    /**
     * 启动渲染循环（用于动画）
     * @returns {void}
     */
    startRenderLoop() {
        const renderFrame = () => {
            if (this.state === GameState.PLAYING) {
                ParticleSystem.update();
                this.render();
            } else if (this.state === GameState.GAME_OVER || this.state === GameState.WIN) {
                // 淡入动画
                if (this.gameOverAlpha < 1) {
                    this.gameOverAlpha += 0.05; // 20 帧 ≈ 333ms
                    this.render();
                    if (this.state === GameState.GAME_OVER) {
                        this.renderGameOverOverlay();
                    } else {
                        this.renderWinOverlay();
                    }
                }
            }
            this.animationFrameId = requestAnimationFrame(renderFrame);
        };
        this.animationFrameId = requestAnimationFrame(renderFrame);
    },
    
    /**
     * 停止渲染循环
     * @returns {void}
     */
    stopRenderLoop() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
};
```

### 4. 修改 Game.start() 方法

```javascript
start() {
    this.state = GameState.PLAYING;
    
    Snake.init();
    Score.reset();
    Score.updateDisplay(this.scoreEl, this.highScoreEl);
    Food.spawn(function(point) { return Snake.occupies(point); });
    ParticleSystem.clear(); // 清空粒子
    this.gameOverAlpha = 0;  // 重置透明度
    
    if (this.loopTimer !== null) {
        clearInterval(this.loopTimer);
    }
    
    Input.consumeDirection();
    
    this.loopTimer = setInterval(this.tick.bind(this), TICK_INTERVAL);
    
    // 启动渲染循环
    this.stopRenderLoop();
    this.startRenderLoop();
}
```

### 5. 修改 Game.tick() 方法（添加粒子生成）

在 `// 7. 吃到食物后加分并生成新食物` 部分：

```javascript
if (ateFood) {
    Score.add();
    Score.updateDisplay(this.scoreEl, this.highScoreEl);
    
    // 生成粒子特效
    ParticleSystem.spawn(foodPos.x, foodPos.y);
    
    if (Snake.getLength() === GRID_COUNT * GRID_COUNT) {
        this.win();
        return;
    }
    
    Food.spawn(function(point) { return Snake.occupies(point); });
}
```

### 6. 修改 Game.render() 方法

```javascript
render() {
    Renderer.drawBackground();
    const foodPos = Food.getPosition();
    if (foodPos) {
        Renderer.drawFood(foodPos, performance.now());
    }
    Renderer.drawSnake(Snake.segments);
    ParticleSystem.render(Renderer.ctx); // 渲染粒子
}
```

### 7. 修改 Game.gameOver() 和 Game.win() 方法

```javascript
gameOver() {
    this.state = GameState.GAME_OVER;
    this.gameOverAlpha = 0; // 重置透明度，准备淡入
    if (this.loopTimer !== null) {
        clearInterval(this.loopTimer);
        this.loopTimer = null;
    }
    this.render();
    // 淡入动画由 renderLoop 处理
}

win() {
    this.state = GameState.WIN;
    this.gameOverAlpha = 0;
    if (this.loopTimer !== null) {
        clearInterval(this.loopTimer);
        this.loopTimer = null;
    }
    this.render();
    // 淡入动画由 renderLoop 处理
}
```

### 8. 新增 Game.renderGameOverOverlay() 和 renderWinOverlay()

```javascript
renderGameOverOverlay() {
    const ctx = Renderer.ctx;
    ctx.save();
    ctx.globalAlpha = this.gameOverAlpha;
    Renderer.drawGameOverScreen(Score.current);
    ctx.restore();
}

renderWinOverlay() {
    const ctx = Renderer.ctx;
    ctx.save();
    ctx.globalAlpha = this.gameOverAlpha;
    Renderer.drawWinScreen(Score.current);
    ctx.restore();
}
```

### 9. 修改 Game.init() 启动渲染循环

在 `Game.init()` 最后添加：

```javascript
init() {
    // ... 现有代码 ...
    
    Renderer.drawBackground();
    Renderer.drawReadyScreen();
    
    // 启动渲染循环（用于食物动画）
    this.startRenderLoop();
}
```

## 预估工作量
1.5 天

## 注意事项

1. **性能优化**：
   - 粒子数量限制在 6-8 个
   - 粒子生命周期短（300ms）
   - 使用 `requestAnimationFrame` 而非 `setInterval` 渲染动画

2. **时间戳获取**：
   - 使用 `performance.now()` 获取高精度时间戳
   - 确保动画流畅且与帧率无关

3. **渲染循环管理**：
   - 游戏开始时启动 `requestAnimationFrame` 循环
   - 游戏结束时不停止循环（用于淡入动画）
   - 避免多个循环同时运行

4. **兼容性**：
   - `requestAnimationFrame` 在所有现代浏览器中支持
   - `performance.now()` 同样支持良好

5. **调试建议**：
   - 先实现食物动画，测试流畅度
   - 再实现粒子系统，测试性能
   - 最后实现淡入动画

## 相关文档
- PRD 文档：`docs/产品/L1-TASK-007-UI优化与地图扩展-PRD.md` 第 3.2.3-3.2.4 节
- 动画参数：PRD 附录 9.2
