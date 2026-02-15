# Issue #8: L2-TASK-008 地图扩展开发

## 任务类型
开发任务（Development）

## 优先级
P0 - 高优先级

## 负责角色
前端开发

## 任务描述

将贪吃蛇游戏地图从 20×20 扩大到 30×30，画布从 400×400px 扩大到 600×600px，并调整相关参数和布局。

## 依赖关系
- 依赖：#7（PRD 文档）
- 前置任务：无
- 后续任务：#9（核心 UI 优化）

## 验收标准

- [ ] 游戏画布尺寸修改为 600×600px
- [ ] 网格数量修改为 30×30
- [ ] 单格尺寸保持 20px
- [ ] 蛇初始位置调整到 (15, 15)
- [ ] 蛇初始长度保持 3 格
- [ ] 游戏速度调整为 180ms/格（可选，需测试）
- [ ] HTML/CSS 布局适配 600px 画布
- [ ] 分数面板宽度调整为 600px
- [ ] 页面居中显示正常
- [ ] 游戏核心功能正常（移动、吃食物、碰撞检测）
- [ ] 最小支持宽度调整为 680px
- [ ] 小屏幕（< 680px）时画布自动缩放

## 实施步骤

### 1. 修改 JavaScript 常量（game.js）

```javascript
// 修改前
const CANVAS_SIZE = 400;
const GRID_COUNT = 20;
const TICK_INTERVAL = 200;

// 修改后
const CANVAS_SIZE = 600;
const GRID_COUNT = 30;
const TICK_INTERVAL = 180; // 可选，需测试流畅度
```

### 2. 修改蛇初始位置（game.js）

```javascript
// Snake.init() 方法中
// 修改前
this.segments = [
    { x: 10, y: 10 },
    { x: 9,  y: 10 },
    { x: 8,  y: 10 }
];

// 修改后
this.segments = [
    { x: 15, y: 15 },
    { x: 14, y: 15 },
    { x: 13, y: 15 }
];
```

### 3. 修改 HTML 画布尺寸（index.html）

```html
<!-- 修改前 -->
<canvas id="gameCanvas" width="400" height="400"></canvas>

<!-- 修改后 -->
<canvas id="gameCanvas" width="600" height="600"></canvas>
```

### 4. 修改 CSS 布局（index.html）

```css
/* 修改游戏容器宽度 */
.game-container {
    width: 600px; /* 400px → 600px */
}

/* 修改分数面板宽度 */
.score-panel {
    width: 600px; /* 400px → 600px */
}

/* 添加响应式支持 */
#gameCanvas {
    max-width: 90vw;
    height: auto;
}

@media (max-width: 680px) {
    .game-container {
        width: 90vw;
    }
    .score-panel {
        width: 100%;
    }
}
```

### 5. 测试

- [ ] 测试游戏启动，蛇在中央位置 (15, 15)
- [ ] 测试蛇移动到边界，碰撞检测正常
- [ ] 测试食物生成，不超出边界
- [ ] 测试吃食物，分数增加正常
- [ ] 测试游戏结束和重新开始
- [ ] 测试小屏幕（< 680px）缩放效果
- [ ] 测试游戏速度（180ms）是否流畅，如不流畅恢复 200ms

## 预估工作量
0.5 天

## 注意事项

1. **速度调整**：180ms 是建议值，如果测试时感觉过快或过慢，可以调整回 200ms 或其他值
2. **响应式测试**：确保在不同屏幕尺寸下游戏可玩，画布不被裁剪
3. **兼容性**：确保修改后在 Chrome、Firefox、Safari、Edge 上正常运行
4. **代码注释**：修改常量时添加注释说明变更原因

## 相关文档
- PRD 文档：`docs/产品/L1-TASK-007-UI优化与地图扩展-PRD.md`
- 原架构设计：`design/L1-TASK-001-架构设计.md`
