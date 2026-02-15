# Issue #9: L2-TASK-009 核心 UI 优化开发

## 任务类型
开发任务（Development）

## 优先级
P0 - 高优先级

## 负责角色
前端开发

## 任务描述

实现游戏核心 UI 优化，包括渐变背景、蛇身渐变、分数面板美化等视觉升级。

## 依赖关系
- 依赖：#7（PRD 文档）、#8（地图扩展）
- 前置任务：#8
- 后续任务：#10（动画特效开发）

## 验收标准

- [ ] 画布背景为深色径向渐变（中心 `#1a1a2e` 到边缘 `#0f0f23`）
- [ ] 网格线改为虚线样式，颜色 `rgba(255, 255, 255, 0.05)`
- [ ] 蛇身从头到尾呈现渐变色（`#00ff88` 到 `#00aa44`）
- [ ] 蛇头有高光效果（半透明白色小圆）
- [ ] 分数面板为卡片样式（半透明背景、圆角、内边距）
- [ ] 分数文字为渐变色（`#00ff88` → `#00d4ff`）
- [ ] 分数前添加 "🏆" emoji，最高分前添加 "⭐" emoji
- [ ] 开始界面标题为渐变文字，字号 64px
- [ ] 开始界面添加副标题 "SNAKE GAME"
- [ ] 开始提示改为按钮样式（背景、边框、圆角）
- [ ] 结束界面遮罩为渐变（`rgba(0,0,0,0.7)` → `rgba(26,26,46,0.9)`）
- [ ] 结束界面标题和分数为渐变文字

## 实施步骤

### 1. 修改 Renderer.drawBackground()（game.js）

```javascript
drawBackground() {
    const ctx = this.ctx;
    
    // 径向渐变背景
    const gradient = ctx.createRadialGradient(
        CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0,
        CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2
    );
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0f0f23');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // 虚线网格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    
    for (let i = 0; i <= GRID_COUNT; i++) {
        const pos = i * CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(CANVAS_SIZE, pos);
        ctx.stroke();
    }
    
    ctx.setLineDash([]); // 重置虚线
}
```

### 2. 修改 Renderer.drawSnake()（game.js）

```javascript
drawSnake(segments) {
    const ctx = this.ctx;
    const len = segments.length;
    
    segments.forEach((seg, index) => {
        // 计算渐变色（从头到尾）
        const ratio = index / Math.max(len - 1, 1);
        const r = Math.round(0 + (0 - 0) * ratio);
        const g = Math.round(255 + (170 - 255) * ratio);
        const b = Math.round(136 + (68 - 136) * ratio);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        
        // 绘制蛇身段（圆角矩形）
        const x = seg.x * CELL_SIZE + 1;
        const y = seg.y * CELL_SIZE + 1;
        const size = CELL_SIZE - 2;
        const radius = 2;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + size - radius, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
        ctx.lineTo(x + size, y + size - radius);
        ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
        ctx.lineTo(x + radius, y + size);
        ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
        
        // 蛇头高光
        if (index === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}
```

### 3. 修改分数面板样式（index.html CSS）

```css
.score-panel {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 600px;
    height: 50px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    backdrop-filter: blur(10px);
    margin-bottom: 10px;
}

.score-panel span {
    background: linear-gradient(90deg, #00ff88, #00d4ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: bold;
    font-size: 22px;
}
```

### 4. 修改分数显示文本（game.js Score 模块）

```javascript
updateDisplay(scoreEl, highScoreEl) {
    scoreEl.textContent = '🏆 分数: ' + this.current;
    highScoreEl.textContent = '⭐ 最高分: ' + this.high;
}
```

### 5. 修改 Renderer.drawReadyScreen()（game.js）

```javascript
drawReadyScreen() {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 渐变标题
    const titleGradient = ctx.createLinearGradient(
        CANVAS_SIZE / 2 - 150, 0,
        CANVAS_SIZE / 2 + 150, 0
    );
    titleGradient.addColorStop(0, '#00ff88');
    titleGradient.addColorStop(1, '#00d4ff');
    
    ctx.fillStyle = titleGradient;
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.shadowColor = 'rgba(0, 255, 136, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText('贪吃蛇', CANVAS_SIZE / 2, 200);
    ctx.shadowBlur = 0;
    
    // 副标题
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('SNAKE GAME', CANVAS_SIZE / 2, 250);
    
    // 按钮样式提示
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
    const btnX = CANVAS_SIZE / 2 - 120;
    const btnY = 320;
    const btnW = 240;
    const btnH = 50;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('按空格键开始游戏', CANVAS_SIZE / 2, 345);
}
```

### 6. 修改 Renderer.drawGameOverScreen()（game.js）

```javascript
drawGameOverScreen(finalScore) {
    const ctx = this.ctx;
    
    // 渐变遮罩
    const maskGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE);
    maskGradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    maskGradient.addColorStop(1, 'rgba(26, 26, 46, 0.9)');
    ctx.fillStyle = maskGradient;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 渐变标题
    const titleGradient = ctx.createLinearGradient(
        CANVAS_SIZE / 2 - 100, 0,
        CANVAS_SIZE / 2 + 100, 0
    );
    titleGradient.addColorStop(0, '#00ff88');
    titleGradient.addColorStop(1, '#00d4ff');
    
    ctx.fillStyle = titleGradient;
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillText('游戏结束', CANVAS_SIZE / 2, 220);
    
    // 分数（渐变）
    ctx.fillStyle = titleGradient;
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText('最终分数: ' + finalScore, CANVAS_SIZE / 2, 280);
    
    // 按钮样式提示
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
    const btnX = CANVAS_SIZE / 2 - 120;
    const btnY = 340;
    const btnW = 240;
    const btnH = 50;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('按空格键重新开始', CANVAS_SIZE / 2, 365);
}
```

### 7. 同步修改 drawWinScreen()

（与 drawGameOverScreen() 类似，标题改为 "恭喜通关"）

## 预估工作量
1 天

## 注意事项

1. **渐变兼容性**：`createLinearGradient` 和 `createRadialGradient` 在所有现代浏览器中支持良好
2. **CSS 渐变文字**：`background-clip: text` 需要 `-webkit-` 前缀，旧版浏览器可能不支持（降级为纯色）
3. **roundRect API**：Canvas `roundRect()` 在较新浏览器中支持，如不支持需手动绘制圆角矩形
4. **性能**：渐变绘制性能良好，无需特殊优化

## 相关文档
- PRD 文档：`docs/产品/L1-TASK-007-UI优化与地图扩展-PRD.md` 第 3.2 节
- 颜色规范：PRD 附录 9.1
