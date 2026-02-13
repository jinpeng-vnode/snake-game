---
创建时间：2026-02-13 20:30
最后更新：2026-02-13 20:30
状态：设计中
---

# L1 TASK-001 贪吃蛇游戏 架构设计文档

## 一、需求摘要

基于 Issue #2，设计一个纯前端贪吃蛇游戏的技术架构。游戏通过浏览器直接打开 `index.html` 运行，无需构建工具或服务器。使用 HTML + CSS + Canvas API + 原生 JavaScript 实现，包含蛇的移动控制、食物生成、碰撞检测、分数系统和游戏状态管理。

## 二、方案选择

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A | 单文件方案：所有代码写在一个 index.html 中 | 极简，双击即用，分享方便 | 代码量大时可读性差，模块边界模糊 |
| B | 多文件模块化：index.html + 多个 JS 文件，用 ES Module 拆分 | 模块清晰，可维护性好 | 需要 HTTP 服务器才能加载 ES Module（file:// 协议下 CORS 限制） |
| C | 少量文件拆分：index.html + 单个 game.js，逻辑用 IIFE/对象模式组织 | 模块有一定边界，双击可用，不依赖 ES Module | 单文件仍然较大，但对此体量项目可接受 |

**选择方案 C，理由：** PRD 明确要求"双击 index.html 即可运行"，方案 B 的 ES Module 在 `file://` 协议下无法工作。方案 A 所有代码混在 HTML 里可读性差。方案 C 用 `<script src="game.js">` 加载，`file://` 协议完全兼容，同时通过 JS 内部的对象/模块模式保持代码组织清晰。

## 三、文件结构

```
snake-game/
├── index.html          # 页面结构：Canvas 元素、分数面板、样式、引入 game.js
├── game.js             # 全部游戏逻辑（模块化组织，详见下方）
├── design/             # 设计文档（架构师产出）
│   └── L1-TASK-001-架构设计.md
├── docs/               # 产品文档、任务跟踪等
│   ├── 产品/
│   ├── 设计/
│   └── 任务跟踪.md
└── README.md           # 项目说明（可选）
```

### 文件职责

| 文件 | 职责 | 行数预估 |
|------|------|----------|
| `index.html` | HTML 结构（Canvas + 分数面板）、CSS 样式（居中布局、配色）、引入 game.js | ~80 行 |
| `game.js` | 游戏引擎、渲染、输入处理、状态管理、食物生成、碰撞检测，全部游戏逻辑 | ~350 行 |

## 四、模块划分

`game.js` 内部按职责划分为以下逻辑模块，使用对象字面量模式组织（不用 class，保持简洁）：

```
game.js 内部模块结构：
┌─────────────────────────────────────────────┐
│  Game（主控制器）                              │
│  ├── 初始化、主循环、状态流转                    │
│  ├── 调用其他模块协作                           │
│  │                                             │
│  ├── Snake（蛇模块）                            │
│  │   └── 蛇的数据结构、移动、生长               │
│  │                                             │
│  ├── Food（食物模块）                           │
│  │   └── 食物生成、位置校验                     │
│  │                                             │
│  ├── Renderer（渲染模块）                       │
│  │   └── Canvas 绘制：背景、蛇、食物、UI 文字    │
│  │                                             │
│  ├── Input（输入模块）                          │
│  │   └── 键盘事件监听、方向队列                  │
│  │                                             │
│  └── Score（分数模块）                          │
│      └── 当前分数、最高分、localStorage 读写     │
└─────────────────────────────────────────────┘
```

## 五、核心数据结构定义

```javascript
// ========== 常量 ==========

/** @type {number} 画布像素尺寸 */
const CANVAS_SIZE = 400;

/** @type {number} 网格数量（每行/每列） */
const GRID_COUNT = 20;

/** @type {number} 每格像素尺寸 */
const CELL_SIZE = 20; // CANVAS_SIZE / GRID_COUNT

/** @type {number} 游戏刷新间隔（毫秒） */
const TICK_INTERVAL = 200;

/** @type {number} 每个食物的分值 */
const SCORE_PER_FOOD = 10;

/** @type {string} localStorage 存储键名 */
const HIGH_SCORE_KEY = 'snakeHighScore';

// ========== 方向枚举 ==========

/**
 * 方向定义，值为坐标增量 {dx, dy}
 * @enum {{dx: number, dy: number}}
 */
const Direction = {
    UP:    { dx: 0,  dy: -1 },
    DOWN:  { dx: 0,  dy: 1  },
    LEFT:  { dx: -1, dy: 0  },
    RIGHT: { dx: 1,  dy: 0  }
};

// ========== 游戏状态枚举 ==========

/**
 * @enum {string}
 */
const GameState = {
    READY:    'ready',    // 开始界面
    PLAYING:  'playing',  // 游戏进行中
    GAME_OVER: 'gameOver', // 游戏结束
    WIN:      'win'       // 通关（蛇填满网格）
};

// ========== 坐标点 ==========

/**
 * 网格坐标点
 * @typedef {{x: number, y: number}} Point
 * x: 0 ~ GRID_COUNT-1（列）
 * y: 0 ~ GRID_COUNT-1（行）
 */

// ========== 蛇数据结构 ==========

/**
 * 蛇由 Point 数组表示
 * segments[0] 为蛇头，segments[length-1] 为蛇尾
 * @typedef {Point[]} SnakeBody
 *
 * 初始状态：蛇头 (10,10)，蛇身 (9,10), (8,10)，方向向右
 */

// ========== 食物数据结构 ==========

/**
 * 食物为单个 Point
 * @typedef {Point} FoodPosition
 */
```

## 六、模块接口签名

### 6.1 Snake 模块

```javascript
const Snake = {
    /** @type {Point[]} 蛇身段数组，[0] 为蛇头 */
    segments: [],

    /** @type {{dx: number, dy: number}} 当前移动方向 */
    direction: Direction.RIGHT,

    /**
     * 初始化蛇到默认位置和方向
     * 蛇头 (10,10)，蛇身 (9,10), (8,10)，方向向右
     * @returns {void}
     */
    init() {},

    /**
     * 获取蛇头位置
     * @returns {Point} 蛇头坐标
     */
    getHead() {},

    /**
     * 移动蛇：头部按方向延伸一格
     * @param {boolean} grow - 是否生长（true 则不移除尾部）
     * @returns {void}
     */
    move(grow) {},

    /**
     * 设置移动方向（内部校验禁止掉头）
     * @param {{dx: number, dy: number}} newDirection - 新方向
     * @returns {boolean} 是否设置成功（掉头时返回 false）
     */
    setDirection(newDirection) {},

    /**
     * 检测蛇头是否与自身碰撞
     * @returns {boolean} true 表示碰撞
     */
    checkSelfCollision() {},

    /**
     * 检测指定坐标是否在蛇身上（用于食物生成校验）
     * @param {Point} point - 待检测坐标
     * @returns {boolean} true 表示该坐标被蛇占据
     */
    occupies(point) {},

    /**
     * 获取蛇身长度
     * @returns {number}
     */
    getLength() {}
};
```

### 6.2 Food 模块

```javascript
const Food = {
    /** @type {Point|null} 当前食物位置 */
    position: null,

    /**
     * 在空白网格上随机生成食物
     * 遍历所有空白格，随机选一个（保证不与蛇身重叠）
     * @param {function(Point): boolean} isOccupied - 判断坐标是否被占据的回调（传入 Snake.occupies）
     * @returns {void}
     */
    spawn(isOccupied) {},

    /**
     * 获取当前食物位置
     * @returns {Point|null}
     */
    getPosition() {}
};
```

### 6.3 Input 模块

```javascript
const Input = {
    /** @type {{dx: number, dy: number}|null} 待处理的方向输入（每帧只取一次） */
    pendingDirection: null,

    /**
     * 初始化键盘事件监听
     * 监听 keydown 事件，映射方向键到 Direction 枚举
     * 监听空格键，触发 onAction 回调
     * @param {function({dx: number, dy: number}): void} onDirection - 方向变更回调
     * @param {function(): void} onAction - 空格键回调（开始/重新开始）
     * @returns {void}
     */
    init(onDirection, onAction) {},

    /**
     * 消费并返回待处理的方向输入，返回后清空
     * 每个游戏帧调用一次，防止一帧内多次变向
     * @returns {{dx: number, dy: number}|null}
     */
    consumeDirection() {}
};
```

### 6.4 Score 模块

```javascript
const Score = {
    /** @type {number} 当前分数 */
    current: 0,

    /** @type {number} 最高分 */
    high: 0,

    /**
     * 初始化：从 localStorage 读取最高分
     * localStorage 不可用时静默降级，high 保持 0
     * @returns {void}
     */
    init() {},

    /**
     * 增加分数（+SCORE_PER_FOOD），如果超过最高分则更新最高分并持久化
     * @returns {void}
     */
    add() {},

    /**
     * 重置当前分数为 0（最高分不重置）
     * @returns {void}
     */
    reset() {},

    /**
     * 将最高分写入 localStorage
     * localStorage 不可用时静默忽略
     * @returns {void}
     */
    save() {},

    /**
     * 更新 HTML 分数面板显示
     * @param {HTMLElement} scoreEl - 当前分数 DOM 元素
     * @param {HTMLElement} highScoreEl - 最高分 DOM 元素
     * @returns {void}
     */
    updateDisplay(scoreEl, highScoreEl) {}
};
```

### 6.5 Renderer 模块

```javascript
const Renderer = {
    /** @type {CanvasRenderingContext2D|null} */
    ctx: null,

    /**
     * 初始化渲染器，获取 Canvas 2D 上下文
     * @param {HTMLCanvasElement} canvas - Canvas 元素
     * @returns {void}
     */
    init(canvas) {},

    /**
     * 清空画布并绘制网格背景
     * 背景色 #1a1a2e，可选浅色网格线
     * @returns {void}
     */
    drawBackground() {},

    /**
     * 绘制蛇
     * 蛇头深绿色 #388E3C，蛇身绿色 #4CAF50，每格 CELL_SIZE × CELL_SIZE
     * @param {Point[]} segments - 蛇身段数组
     * @returns {void}
     */
    drawSnake(segments) {},

    /**
     * 绘制食物
     * 红色圆形 #F44336，直径 16px，居中于网格
     * @param {Point} position - 食物网格坐标
     * @returns {void}
     */
    drawFood(position) {},

    /**
     * 绘制开始界面（Canvas 内）
     * "贪吃蛇" 标题 48px + "按空格键开始游戏" 提示 20px，白色，居中
     * @returns {void}
     */
    drawReadyScreen() {},

    /**
     * 绘制游戏结束界面（Canvas 内）
     * 半透明黑色遮罩 + "游戏结束" 36px + "最终分数: {N}" 24px + "按空格键重新开始" 18px
     * @param {number} finalScore - 最终分数
     * @returns {void}
     */
    drawGameOverScreen(finalScore) {},

    /**
     * 绘制通关界面（Canvas 内）
     * 半透明遮罩 + "恭喜通关" + 最终分数 + 重新开始提示
     * @param {number} finalScore - 最终分数
     * @returns {void}
     */
    drawWinScreen(finalScore) {}
};
```

### 6.6 Game 主控制器

```javascript
const Game = {
    /** @type {string} 当前游戏状态，值为 GameState 枚举 */
    state: GameState.READY,

    /** @type {number|null} 游戏循环定时器 ID */
    loopTimer: null,

    /**
     * 初始化游戏：获取 DOM 元素，初始化所有子模块，绘制开始界面
     * 页面加载完成后调用
     * @returns {void}
     */
    init() {},

    /**
     * 开始游戏：重置蛇和分数，生成食物，启动游戏循环
     * 空格键在 READY 或 GAME_OVER/WIN 状态下触发
     * @returns {void}
     */
    start() {},

    /**
     * 游戏主循环（每 TICK_INTERVAL 毫秒执行一次）：
     * 1. 消费输入方向 → 设置蛇方向
     * 2. 计算蛇头新位置
     * 3. 检测墙壁碰撞 → 游戏结束
     * 4. 检测自身碰撞 → 游戏结束
     * 5. 检测是否吃到食物 → 生长 + 加分 + 生成新食物
     * 6. 移动蛇
     * 7. 检测是否通关（蛇长度 == GRID_COUNT * GRID_COUNT）
     * 8. 重新渲染画面
     * @returns {void}
     */
    tick() {},

    /**
     * 检测蛇头是否超出网格边界
     * @param {Point} head - 蛇头坐标
     * @returns {boolean} true 表示撞墙
     */
    checkWallCollision(head) {},

    /**
     * 结束游戏：停止循环，更新状态，绘制结束界面
     * @returns {void}
     */
    gameOver() {},

    /**
     * 渲染当前帧：背景 → 食物 → 蛇
     * @returns {void}
     */
    render() {}
};
```

## 七、模块依赖关系

```
Input ──→ Game（主控制器）←── Score
                │
          ┌─────┼─────┐
          ▼     ▼     ▼
        Snake  Food  Renderer

依赖方向（→ 表示"被调用"）：
- Game 调用 Snake、Food、Renderer、Input、Score 的接口
- Snake、Food、Renderer、Input、Score 之间互不直接调用
- Food.spawn() 通过回调函数间接依赖 Snake.occupies()（由 Game 传入）
- Input 通过回调函数通知 Game 方向变更和空格键事件
```

所有模块之间无循环依赖。Game 是唯一的协调者，其他模块只暴露接口，不主动调用其他模块。

## 八、游戏主循环流程

```
页面加载 → Game.init()
              │
              ▼
         绘制开始界面（READY 状态）
              │
         用户按空格键
              │
              ▼
         Game.start()
         ├── Snake.init()        // 蛇重置到 (10,10)
         ├── Score.reset()       // 分数归零
         ├── Food.spawn()        // 生成食物
         └── 启动 setInterval(Game.tick, 200ms)
              │
              ▼
    ┌──→ Game.tick()（每 200ms）
    │       │
    │       ├── 1. Input.consumeDirection() → Snake.setDirection()
    │       │
    │       ├── 2. 计算蛇头新位置 newHead = head + direction
    │       │
    │       ├── 3. Game.checkWallCollision(newHead)?
    │       │      └── 是 → Game.gameOver() → 绘制结束界面 → 停止循环
    │       │
    │       ├── 4. Snake.checkSelfCollision()?（用新头位置检测）
    │       │      └── 是 → Game.gameOver()
    │       │
    │       ├── 5. newHead == Food.position?
    │       │      ├── 是 → Snake.move(grow=true), Score.add(), Food.spawn()
    │       │      └── 否 → Snake.move(grow=false)
    │       │
    │       ├── 6. Snake.getLength() == 400? → 通关
    │       │
    │       └── 7. Game.render()
    │               ├── Renderer.drawBackground()
    │               ├── Renderer.drawFood()
    │               ├── Renderer.drawSnake()
    │               └── Score.updateDisplay()
    │
    └──────────── 循环继续
```

## 九、错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| localStorage 不可用（隐私模式） | try-catch 包裹读写操作，静默降级，最高分默认 0 |
| Canvas 不支持 | 页面显示 `<noscript>` 或降级提示（极端情况，现代浏览器均支持） |
| 食物无法生成（蛇填满网格） | 检测蛇长度 == 400，触发通关逻辑，不再调用 Food.spawn() |
| 快速连续按键 | Input 模块每帧只保留最后一次有效方向输入，Game.tick() 每帧只消费一次 |
| 方向键掉头 | Snake.setDirection() 内部校验，反方向直接忽略返回 false |

## 十、模块分配表

本项目为纯前端单人开发任务，只有两个文件，由同一个前端开发者负责：

| 模块 | 负责文件 | 说明 |
|------|----------|------|
| 页面结构与样式 | `index.html` | HTML 结构、CSS 样式 |
| 全部游戏逻辑 | `game.js` | Snake、Food、Renderer、Input、Score、Game 全部模块 |

共享文件负责人：前端开发者（仅一人，无冲突）。

## 十一、开发层级

| 层级 | 包含任务 | 说明 |
|------|----------|------|
| L1 | TASK-001（架构设计）、TASK-002（UI 设计） | 无前置依赖，可并行 |
| L2 | TASK-003（核心开发） | 依赖 L1 的架构设计和 UI 设计完成 |
| L3 | TASK-004（代码审查）、TASK-005（功能测试） | 依赖 L2 开发完成 |

## 十二、开发者注意事项

1. **双击可用**：`game.js` 用 `<script src="game.js"></script>` 引入，不要用 `type="module"`，否则 `file://` 协议下无法加载
2. **防抖方向输入**：每个 tick 只处理一次方向变更，避免快速按键导致掉头。具体实现：Input 模块缓存最新一次有效方向，tick 开始时消费
3. **食物生成算法**：收集所有空白格坐标到数组，随机取一个。不要用"随机坐标 + 重试"方式，蛇很长时重试次数不可控
4. **自身碰撞检测时机**：在蛇移动后（新头已加入 segments）、移除尾部之前检测。或者先计算新头坐标，与当前蛇身（不含尾部，因为尾部会移走）比较
5. **通关判定**：蛇长度达到 400（20×20）时显示"恭喜通关"，这是 PRD 明确要求的边界情况
6. **CSS 居中**：使用 flexbox 居中游戏区域，最小宽度 480px
7. **字体统一用 Arial**：PRD 指定字体为 Arial
8. **颜色严格按 PRD**：背景 `#1a1a2e`，蛇身 `#4CAF50`，蛇头 `#388E3C`，食物 `#F44336`，遮罩 `rgba(0,0,0,0.5)`
