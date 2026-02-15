# L1-TASK-008 视觉升级架构设计文档

---
创建时间：2026-02-14 01:56
最后更新：2026-02-14 01:56
状态：设计中
---

## 一、需求摘要

基于 Issue #11 和 PRD 文档（docs/产品/L1-TASK-007-贪吃蛇视觉升级-PRD.md），对现有贪吃蛇游戏进行视觉升级：
1. 画布自适应屏幕大小（400-800px）
2. 蛇造型升级（圆角、眼睛、渐变色）
3. 食物改为苹果样式
4. 背景改为棋盘格
5. UI 文字样式升级

**约束：不改变任何游戏逻辑，纯原生实现。**

## 二、方案选择

### 方案对比

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A. 重构 Renderer 模块 | 保持模块结构不变，只修改 Renderer 内部绘制逻辑 | 改动最小，风险低，逻辑模块不受影响 | 需要将固定常量改为动态计算 |
| B. 新增 VisualEngine 模块 | 创建新模块处理视觉效果，Renderer 调用 | 职责分离清晰 | 增加复杂度，过度设计 |

**选择方案 A**，理由：视觉升级只涉及绘制逻辑，不涉及游戏状态管理，在 Renderer 模块内部改造即可，符合最小改动原则。

## 三、文件结构

本次升级只修改现有文件，不新增文件：

```
/
├── game.js          # 修改：Renderer 模块 + 常量动态化
├── index.html       # 修改：移除固定宽高，改为 CSS 控制
└── (其他文件不变)
```

## 四、改造方案

### 4.1 常量动态化

将固定常量改为动态计算：

```javascript
// 旧常量（删除）
// const CANVAS_SIZE = 400;
// const CELL_SIZE = 20;

// 新增：画布尺寸管理对象
const CanvasSize = {
    /** @type {number} 当前画布像素尺寸（正方形） */
    current: 400,
    
    /** @type {number} 每格像素尺寸 */
    cellSize: 20,
    
    /** @type {number} 网格数量（固定不变） */
    gridCount: 20,
    
    /** @type {number} 最小画布尺寸 */
    min: 400,
    
    /** @type {number} 最大画布尺寸 */
    max: 800,
    
    /**
     * 根据视口大小计算最佳画布尺寸
     * @returns {number} 画布尺寸（向下取整到网格整数倍）
     */
    calculate() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const size = Math.min(vw * 0.8, vh * 0.7, this.max);
        const clamped = Math.max(size, this.min);
        // 向下取整到 gridCount 的整数倍
        const cellSize = Math.floor(clamped / this.gridCount);
        return cellSize * this.gridCount;
    },
    
    /**
     * 更新画布尺寸
     * @param {HTMLCanvasElement} canvas
     * @returns {void}
     */
    update(canvas) {
        this.current = this.calculate();
        this.cellSize = this.current / this.gridCount;
        canvas.width = this.current;
        canvas.height = this.current;
    }
};
```

**影响范围：** 所有使用 `CANVAS_SIZE` 和 `CELL_SIZE` 的地方改为 `CanvasSize.current` 和 `CanvasSize.cellSize`。

### 4.2 Renderer 模块改造

#### 4.2.1 初始化增强

```javascript
// Renderer.init() 修改
init(canvas) {
    this.ctx = canvas.getContext('2d');
    // 初始化画布尺寸
    CanvasSize.update(canvas);
    // 监听窗口缩放
    window.addEventListener('resize', () => {
        CanvasSize.update(canvas);
        // 如果游戏正在进行，重新渲染当前帧
        if (Game.state === GameState.PLAYING) {
            Game.render();
        }
    });
}
```

#### 4.2.2 背景绘制（棋盘格）

```javascript
drawBackground() {
    const ctx = this.ctx;
    const size = CanvasSize.current;
    const cellSize = CanvasSize.cellSize;
    const gridCount = CanvasSize.gridCount;
    
    // 绘制棋盘格
    for (let x = 0; x < gridCount; x++) {
        for (let y = 0; y < gridCount; y++) {
            // 交替色
            ctx.fillStyle = (x + y) % 2 === 0 ? '#1a1a2e' : '#16162a';
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
}
```

#### 4.2.3 蛇绘制（圆角 + 眼睛 + 渐变）

```javascript
drawSnake(segments) {
    const ctx = this.ctx;
    const cellSize = CanvasSize.cellSize;
    const len = segments.length;
    
    segments.forEach((seg, index) => {
        const isHead = index === 0;
        const isTail = index === len - 1;
        
        // 计算颜色（渐变）
        const ratio = index / Math.max(len - 1, 1);
        const color = this.interpolateColor('#4CAF50', '#81C784', ratio);
        
        // 计算尺寸和位置
        let size = cellSize - 2; // 留间隙
        let x = seg.x * cellSize + 1;
        let y = seg.y * cellSize + 1;
        
        // 蛇尾缩小
        if (isTail) {
            size = size * 0.8;
            const offset = (cellSize - 2 - size) / 2;
            x += offset;
            y += offset;
        }
        
        // 绘制圆角矩形
        const radius = isHead ? cellSize * 0.4 : cellSize * 0.35;
        ctx.fillStyle = color;
        this.roundRect(ctx, x, y, size, size, radius);
        
        // 蛇头绘制眼睛
        if (isHead) {
            this.drawEyes(ctx, seg, Snake.direction, cellSize);
        }
    });
}

/**
 * 绘制圆角矩形
 */
roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

/**
 * 绘制蛇头眼睛
 */
drawEyes(ctx, headPos, direction, cellSize) {
    const centerX = headPos.x * cellSize + cellSize / 2;
    const centerY = headPos.y * cellSize + cellSize / 2;
    const eyeRadius = cellSize * 0.1;
    const pupilRadius = cellSize * 0.05;
    const offset = cellSize * 0.15; // 眼睛偏移量
    
    let eye1X, eye1Y, eye2X, eye2Y;
    
    // 根据方向确定眼睛位置
    if (direction === Direction.RIGHT) {
        eye1X = centerX + offset; eye1Y = centerY - offset;
        eye2X = centerX + offset; eye2Y = centerY + offset;
    } else if (direction === Direction.LEFT) {
        eye1X = centerX - offset; eye1Y = centerY - offset;
        eye2X = centerX - offset; eye2Y = centerY + offset;
    } else if (direction === Direction.UP) {
        eye1X = centerX - offset; eye1Y = centerY - offset;
        eye2X = centerX + offset; eye2Y = centerY - offset;
    } else { // DOWN
        eye1X = centerX - offset; eye1Y = centerY + offset;
        eye2X = centerX + offset; eye2Y = centerY + offset;
    }
    
    // 绘制两只眼睛
    [{ x: eye1X, y: eye1Y }, { x: eye2X, y: eye2Y }].forEach(eye => {
        // 白色眼白
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        // 黑色瞳孔
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, pupilRadius, 0, Math.PI * 2);
        ctx.fill();
    });
}

/**
 * 颜色插值（线性）
 */
interpolateColor(color1, color2, ratio) {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
    const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
    const b = Math.round(c1.b + (c2.b - c1.b) * ratio);
    return `rgb(${r},${g},${b})`;
}

hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}
```

#### 4.2.4 食物绘制（苹果样式）

```javascript
drawFood(position) {
    const ctx = this.ctx;
    const cellSize = CanvasSize.cellSize;
    const centerX = position.x * cellSize + cellSize / 2;
    const centerY = position.y * cellSize + cellSize / 2;
    const radius = cellSize * 0.375; // 直径 75%
    
    // 主体：红色圆形
    ctx.fillStyle = '#F44336';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 高光：左上角白色小圆弧
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // 茎：顶部短棕色线段
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = cellSize * 0.05;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY - radius - cellSize * 0.1);
    ctx.stroke();
    
    // 叶子：顶部偏右小绿色椭圆
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.ellipse(
        centerX + radius * 0.3, 
        centerY - radius - cellSize * 0.05, 
        cellSize * 0.1, 
        cellSize * 0.06, 
        Math.PI / 4, 
        0, 
        Math.PI * 2
    );
    ctx.fill();
}
```

#### 4.2.5 UI 文字绘制（动态字号）

```javascript
drawReadyScreen() {
    const ctx = this.ctx;
    const size = CanvasSize.current;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 标题
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.12}px "Segoe UI", Arial, sans-serif`;
    ctx.fillText('贪吃蛇', size / 2, size * 0.4);
    
    // 提示
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `${size * 0.05}px "Segoe UI", Arial, sans-serif`;
    ctx.fillText('按空格键开始游戏', size / 2, size * 0.55);
}

drawGameOverScreen(finalScore) {
    const ctx = this.ctx;
    const size = CanvasSize.current;
    
    // 遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, size, size);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 标题
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.09}px "Segoe UI", Arial, sans-serif`;
    ctx.fillText('游戏结束', size / 2, size * 0.35);
    
    // 最终分数
    ctx.fillStyle = '#FFD700';
    ctx.font = `${size * 0.06}px "Segoe UI", Arial, sans-serif`;
    ctx.fillText('最终分数: ' + finalScore, size / 2, size * 0.5);
    
    // 重新开始提示
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `${size * 0.045}px "Segoe UI", Arial, sans-serif`;
    ctx.fillText('按空格键重新开始', size / 2, size * 0.65);
}

drawWinScreen(finalScore) {
    const ctx = this.ctx;
    const size = CanvasSize.current;
    
    // 遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, size, size);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 标题
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.09}px "Segoe UI", Arial, sans-serif`;
    ctx.fillText('恭喜通关', size / 2, size * 0.35);
    
    // 最终分数
    ctx.fillStyle = '#FFD700';
    ctx.font = `${size * 0.06}px "Segoe UI", Arial, sans-serif`;
    ctx.fillText('最终分数: ' + finalScore, size / 2, size * 0.5);
    
    // 重新开始提示
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `${size * 0.045}px "Segoe UI", Arial, sans-serif`;
    ctx.fillText('按空格键重新开始', size / 2, size * 0.65);
}
```

### 4.3 Score 模块改造

```javascript
// Score.updateDisplay() 修改
updateDisplay(scoreEl, highScoreEl) {
    scoreEl.textContent = '分数: ' + this.current;
    highScoreEl.textContent = '最高分: ' + this.high;
    // 更新面板宽度
    const panel = scoreEl.parentElement;
    if (panel) {
        panel.style.width = CanvasSize.current + 'px';
    }
}
```

### 4.4 Game 模块改造

```javascript
// Game.checkWallCollision() 修改
checkWallCollision(head) {
    const gridCount = CanvasSize.gridCount;
    return head.x < 0 || head.x >= gridCount ||
           head.y < 0 || head.y >= gridCount;
}
```

### 4.5 index.html 改造

```html
<!-- 移除 canvas 固定宽高 -->
<canvas id="gameCanvas"></canvas>

<!-- CSS 改造 -->
<style>
#gameCanvas {
    display: block;
    margin: 20px auto;
    background: #1a1a2e;
    /* 移除固定宽高，由 JS 动态设置 */
}

#scorePanel {
    /* 宽度由 JS 动态设置 */
    margin: 0 auto;
    text-align: center;
    font-family: "Segoe UI", Arial, sans-serif;
}

#score {
    color: #FFD700; /* 金色 */
    font-size: 20px;
    margin-right: 20px;
}

#highScore {
    color: #B0BEC5; /* 银灰色 */
    font-size: 20px;
}
</style>
```

## 五、对外接口

本次升级不改变模块间接口，所有改动在模块内部。

| 模块 | 修改的方法 | 参数 | 返回 | 说明 |
|------|-----------|------|------|------|
| Renderer | init(canvas) | HTMLCanvasElement | void | 新增 resize 监听 |
| Renderer | drawBackground() | 无 | void | 改为棋盘格绘制 |
| Renderer | drawSnake(segments) | Array | void | 新增圆角、眼睛、渐变 |
| Renderer | drawFood(position) | Object | void | 改为苹果样式 |
| Renderer | drawReadyScreen() | 无 | void | 字号动态化 |
| Renderer | drawGameOverScreen(score) | number | void | 字号动态化 |
| Renderer | drawWinScreen(score) | number | void | 字号动态化 |
| Score | updateDisplay(el1, el2) | HTMLElement × 2 | void | 新增面板宽度设置 |

**新增内部方法（Renderer 私有）：**
- `roundRect(ctx, x, y, w, h, r)` - 绘制圆角矩形
- `drawEyes(ctx, pos, dir, size)` - 绘制蛇头眼睛
- `interpolateColor(c1, c2, ratio)` - 颜色插值
- `hexToRgb(hex)` - 十六进制转 RGB

## 六、模块依赖

- **依赖：** 无新增依赖
- **被依赖：** Game 模块调用 Renderer 的接口不变

## 七、错误处理

无新增错误场景。视觉升级不涉及业务逻辑错误。

**边界情况：**
- 窗口极小（< 400px）：画布固定为 400px，可能超出视口，用户需滚动查看
- 窗口极大（> 1000px）：画布固定为 800px，居中显示
- resize 频繁触发：每次 resize 都重新计算并渲染，性能影响可忽略（Canvas 绘制足够快）

## 八、模块分配表

本次升级只涉及前端开发，单人完成。

| 模块 | 负责目录 | 修改文件 | 可读目录 | 禁止触碰 |
|------|----------|---------|---------|----------|
| 视觉升级 | / | game.js, index.html | design/, docs/ | 无 |

## 九、开发层级

| 层级 | 包含任务 | 说明 |
|------|----------|------|
| L1 | TASK-008（本设计文档） | 无前置依赖 |
| L2 | TASK-009（前端实现） | 依赖本设计文档完成 |
| L3 | TASK-010（审查）、TASK-011（测试） | 依赖前端实现完成 |

## 十、开发者注意事项

1. **所有 `CANVAS_SIZE` 和 `CELL_SIZE` 必须改为 `CanvasSize.current` 和 `CanvasSize.cellSize`**
2. **所有 `GRID_COUNT` 改为 `CanvasSize.gridCount`**
3. **不要修改任何游戏逻辑模块（Snake、Food、Input、Score 的逻辑方法）**
4. **resize 监听器在 Renderer.init() 中添加，只添加一次**
5. **颜色插值算法使用线性插值，足够简单高效**
6. **眼睛位置根据 `Snake.direction` 动态计算，注意 Direction 对象的引用**
7. **测试时重点验证：**
   - 窗口缩放时画布实时调整
   - 蛇头眼睛朝向正确（四个方向都测试）
   - 蛇身渐变色平滑
   - 食物苹果样式完整（主体、高光、茎、叶子）
   - 所有游戏逻辑不变（移动、碰撞、计分）

## 十一、性能考虑

- **resize 事件防抖：** 不做防抖，因为 Canvas 绘制足够快，实时响应体验更好
- **颜色插值缓存：** 不做缓存，每帧计算开销可忽略（蛇身最多 400 节）
- **圆角矩形绘制：** 使用原生 Canvas API，性能最优

## 十二、兼容性说明

- `ctx.ellipse()` 用于绘制叶子，IE 不支持，但 PRD 已明确不支持 IE
- 其他 API 均为标准 Canvas 2D API，现代浏览器全支持
