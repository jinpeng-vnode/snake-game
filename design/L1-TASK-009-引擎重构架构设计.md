# L1 TASK-009 引擎重构架构设计 设计文档

## 一、需求摘要

根据 Issue #44（L1 TASK-009）和 PRD（docs/产品/L1-TASK-008-引擎重构-PRD.md），需要为贪吃蛇项目选定 Web 游戏引擎，替代当前手写的 Canvas 渲染、输入处理、粒子系统等底层模块。现有项目 11 个 JS 模块共 1664 行代码，全部使用原生 Canvas API。重构目标是降低代码复杂度，100% 保留现有功能，部署方式不变（GitHub Pages 静态站点）。

## 二、引擎选型对比

### 2.1 候选引擎

| 维度 | Phaser 3 | PixiJS v8 | Kaplay |
|------|----------|-----------|--------|
| GitHub Stars | 39k | 46.4k | 1.5k |
| 贡献者 | 573 | ~500 | 94 |
| 最新版本 | v3.90.0 (2025-05) | v8.x (持续更新) | 4000.0.0-alpha.26 |
| 包体积(min) | ~1MB（完整）/ <150KB（Compressor 裁剪后 min+gz） | ~450KB min | ~300KB min（估算） |
| 定位 | 完整 2D 游戏框架 | 2D 渲染引擎 | 轻量游戏库 |
| 场景管理 | ✅ 内置 Scene 系统 | ❌ 需自行实现 | ✅ 内置 Scene |
| 输入系统 | ✅ 键盘/鼠标/触屏/手柄 | ❌ 需自行实现或用插件 | ✅ 内置 |
| 粒子系统 | ✅ 内置 ParticleEmitter | ❌ 需 @pixi/particle-emitter | ✅ 内置 |
| 音频系统 | ✅ 内置 Web Audio | ❌ 需 @pixi/sound | ✅ 内置 |
| 物理引擎 | ✅ Arcade/Matter.js | ❌ 无 | ✅ 内置 Arcade |
| TypeScript | ✅ 完整类型定义 | ✅ 原生 TS | ✅ 原生 TS |
| 文档质量 | ⭐⭐⭐⭐⭐ 极其丰富 | ⭐⭐⭐⭐ 良好 | ⭐⭐⭐ 一般 |
| 社区活跃度 | ⭐⭐⭐⭐⭐ 10年+，商业维护 | ⭐⭐⭐⭐⭐ 活跃 | ⭐⭐ 较新，从 Kaboom.js fork |
| GitHub Pages 兼容 | ✅ CDN 引入或 Vite 构建 | ✅ 同上 | ✅ 同上 |
| 学习曲线 | 中等（API 丰富但有体系） | 较陡（需自建游戏框架） | 低（API 简洁） |

### 2.2 方案对比

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A: Phaser 3 | 使用 Phaser 完整游戏框架 | 内置场景/输入/粒子/音频，开箱即用；文档和社区极其丰富；10年商业维护稳定可靠；Compressor 可裁剪包体积 | 完整包体积较大（可通过 Compressor 解决）；需引入 Vite 构建流程 |
| B: PixiJS v8 | 使用 PixiJS 渲染引擎 + 自建游戏逻辑 | 渲染性能最强；包体积较小；灵活度高 | 无内置游戏框架，输入/粒子/音频/场景需自行实现或引入多个插件，等于重新造轮子，违背"降低复杂度"目标 |
| C: Kaplay | 使用 Kaplay 轻量游戏库 | API 极简，上手快；包体积小 | 社区小（1.5k stars）；最新版仍为 alpha；文档不够完善；长期维护风险高 |

**选择方案 A（Phaser 3），理由：**

1. **核心目标匹配**：重构的核心目标是"降低复杂度"。Phaser 内置场景管理、输入系统、粒子系统、音频系统，可直接替代现有手写的 renderer.js（395行）、input.js（151行）、particle.js（80行）、sound.js（174行），总计 800 行底层代码由引擎接管。
2. **功能覆盖完整**：现有 11 个模块的所有功能（键盘/触屏/虚拟方向键输入、5种食物渲染、粒子特效、Web Audio 音效、暂停遮罩、响应式适配）均有 Phaser 原生 API 对应，无需额外插件。
3. **稳定性和生态**：39k stars，573 贡献者，10年+商业维护，文档和示例极其丰富，遇到问题容易找到解决方案。
4. **包体积可控**：通过 Phaser Compressor 可裁剪至 <150KB (min+gz)，或通过 Vite tree-shaking 优化。
5. **部署兼容**：支持 Vite 构建输出纯静态文件，完全兼容 GitHub Pages。


## 三、构建与部署方案

### 3.1 引入 Vite 构建

现有项目使用原生 ES Module（`<script type="module">`），无构建工具。引入 Phaser 后需要 Vite 作为构建工具：

- **开发阶段**：`vite dev` 提供 HMR 热更新
- **构建阶段**：`vite build` 输出到 `dist/` 目录，纯静态文件
- **部署阶段**：GitHub Actions 部署 `dist/` 目录到 GitHub Pages

### 3.2 GitHub Actions 更新

```yaml
# .github/workflows/deploy-pages.yml 需修改
# 构建步骤：npm ci → npm run build
# 上传路径：从 . 改为 dist/
```

### 3.3 CDN 引入方式（备选）

如果不想引入构建工具，可通过 CDN 直接引入：
```html
<script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js"></script>
```
但此方式无法 tree-shaking，包体积较大（~1MB），且无法使用 ES Module import。**不推荐。**

**最终决定：使用 Vite 构建。** 理由：支持 tree-shaking 减小包体积、支持 TypeScript、支持 HMR 开发体验好、输出纯静态文件兼容 GitHub Pages。

## 四、新项目目录结构

```
snake-game/
├── index.html                    # Vite 入口 HTML
├── package.json                  # 依赖管理
├── vite.config.ts                # Vite 配置
├── tsconfig.json                 # TypeScript 配置
├── src/                          # 源码目录
│   ├── main.ts                   # 入口：创建 Phaser.Game 实例
│   ├── config.ts                 # Phaser 游戏配置（画布尺寸、场景列表等）
│   ├── constants.ts              # 游戏常量（从 js/constants.js 迁移）
│   ├── scenes/                   # Phaser 场景
│   │   ├── GameScene.ts          # 游戏主场景（playing 状态的核心逻辑）
│   │   └── UIScene.ts            # UI 覆盖层场景（分数、效果指示器、遮罩）
│   ├── objects/                  # 游戏对象
│   │   ├── Snake.ts              # 蛇对象（数据模型 + Phaser 渲染）
│   │   ├── Food.ts               # 食物对象（生成逻辑 + Phaser 渲染）
│   │   └── Particle.ts           # 粒子特效（封装 Phaser ParticleEmitter）
│   ├── managers/                 # 管理器
│   │   ├── InputManager.ts       # 输入管理（封装 Phaser 输入 + 虚拟方向键）
│   │   ├── SoundManager.ts       # 音效管理（封装 Phaser/Web Audio）
│   │   ├── EffectManager.ts      # 特效管理（加速/减速/双倍，纯逻辑）
│   │   └── ScoreManager.ts       # 分数管理（纯逻辑 + localStorage）
│   └── types.ts                  # 公共类型定义
├── public/                       # 静态资源（直接复制到 dist/）
├── dist/                         # 构建输出（git ignore）
├── design/                       # 设计文档（保留）
├── docs/                         # 项目文档（保留）
└── .github/workflows/            # CI/CD
    └── deploy-pages.yml          # GitHub Pages 部署（需更新）
```


## 五、模块划分与职责

### 5.1 现有模块到新模块的映射

| 现有文件 | 行数 | 新模块 | 迁移策略 |
|----------|------|--------|----------|
| `js/main.js` | 12 | `src/main.ts` | 重写为 Phaser.Game 初始化 |
| `js/constants.js` | 78 | `src/constants.ts` | 直接迁移，改为 TS，数值不变 |
| `js/game.js` | 390 | `src/scenes/GameScene.ts` | 游戏循环由 Phaser Scene.update() 接管，状态管理保留 |
| `js/renderer.js` | 395 | `src/scenes/GameScene.ts` + `src/scenes/UIScene.ts` | **完全废弃**，渲染由 Phaser Graphics/Text 对象替代 |
| `js/snake.js` | 114 | `src/objects/Snake.ts` | 数据逻辑保留，渲染改用 Phaser Graphics |
| `js/food.js` | 104 | `src/objects/Food.ts` | 生成逻辑保留，渲染改用 Phaser Graphics |
| `js/input.js` | 151 | `src/managers/InputManager.ts` | **完全废弃**，改用 Phaser Input 系统 |
| `js/particle.js` | 80 | `src/objects/Particle.ts` | **完全废弃**，改用 Phaser ParticleEmitter |
| `js/sound.js` | 174 | `src/managers/SoundManager.ts` | Web Audio 合成逻辑保留（PRD 要求不引入音频文件），Phaser 管理生命周期 |
| `js/effect.js` | 86 | `src/managers/EffectManager.ts` | 纯逻辑，直接迁移为 TS |
| `js/score.js` | 80 | `src/managers/ScoreManager.ts` | 纯逻辑，直接迁移为 TS |

### 5.2 各模块详细职责

#### `src/main.ts` — 入口
- 创建 `Phaser.Game` 实例，传入配置
- 处理页面 resize 事件，调用 `game.scale.resize()`

#### `src/config.ts` — Phaser 游戏配置
- 导出 `Phaser.Types.Core.GameConfig` 对象
- 配置项：Canvas 渲染模式、画布尺寸、场景列表、缩放模式（Scale.FIT）、背景色

#### `src/constants.ts` — 游戏常量
- 从 `js/constants.js` 1:1 迁移，改为 TypeScript const enum / const
- 所有数值保持不变

#### `src/scenes/GameScene.ts` — 游戏主场景
- 继承 `Phaser.Scene`
- `create()`：初始化蛇、食物、输入、音效、粒子
- `update(time, delta)`：替代原 `Game.tick()`，处理游戏主循环
- 管理游戏状态（ready/playing/paused/gameOver/win）
- 协调所有子模块

#### `src/scenes/UIScene.ts` — UI 覆盖层场景
- 继承 `Phaser.Scene`，以覆盖层方式运行（`this.scene.launch('UIScene')`）
- 绘制：效果状态指示器、暂停遮罩、游戏结束/通关遮罩、开始界面
- 监听 GameScene 事件更新 UI

#### `src/objects/Snake.ts` — 蛇对象
- 数据模型：segments 数组、direction、移动/碰撞逻辑（从 js/snake.js 迁移）
- 渲染：使用 Phaser.GameObjects.Graphics 绘制蛇头（圆角矩形+眼睛）、蛇身（渐变色）、蛇尾（略小）

#### `src/objects/Food.ts` — 食物对象
- 生成逻辑：概率随机、限时倒计时、闪烁（从 js/food.js 迁移）
- 渲染：使用 Phaser.GameObjects.Graphics 绘制 5 种形状（circle/diamond/triangle/star/square）

#### `src/objects/Particle.ts` — 粒子特效
- 封装 Phaser.GameObjects.Particles.ParticleEmitter
- 提供 `spawn(gridX, gridY, color)` 接口
- 吃食物和游戏结束时触发

#### `src/managers/InputManager.ts` — 输入管理
- 封装 Phaser Input：`this.scene.input.keyboard`（键盘）、`this.scene.input.on('pointerdown/pointerup')`（触屏滑动）
- 管理虚拟方向键（DOM 按钮，通过事件桥接到 Phaser）
- 提供 `consumeDirection()` 接口，与现有逻辑一致

#### `src/managers/SoundManager.ts` — 音效管理
- 保留 Web Audio API 合成音效逻辑（PRD 要求不引入音频文件）
- 管理 AudioContext 生命周期
- 静音状态持久化到 localStorage

#### `src/managers/EffectManager.ts` — 特效管理
- 纯逻辑，从 js/effect.js 直接迁移为 TS
- 管理加速/减速/双倍得分效果的添加、更新、过期

#### `src/managers/ScoreManager.ts` — 分数管理
- 纯逻辑，从 js/score.js 直接迁移为 TS
- 管理当前分数、最高分、localStorage 持久化

#### `src/types.ts` — 公共类型定义
- Direction、GameState、FoodType 等类型定义


## 六、类型定义

```typescript
// src/types.ts

/** 方向枚举，值为坐标增量 */
export const Direction = {
    UP:    { dx: 0,  dy: -1 },
    DOWN:  { dx: 0,  dy: 1  },
    LEFT:  { dx: -1, dy: 0  },
    RIGHT: { dx: 1,  dy: 0  },
} as const;

export type DirectionValue = typeof Direction[keyof typeof Direction];

/** 游戏状态枚举 */
export enum GameState {
    READY     = 'ready',
    PLAYING   = 'playing',
    PAUSED    = 'paused',
    GAME_OVER = 'gameOver',
    WIN       = 'win',
}

/** 食物类型定义 */
export interface FoodTypeConfig {
    name: string;
    color: string;
    shape: 'circle' | 'diamond' | 'triangle' | 'star' | 'square';
    score: number;
    probability: number;
    timeout: number | null;
    effect: 'speed' | 'slow' | 'double' | null;
    effectDuration: number | null;
}

/** 网格坐标 */
export interface GridPoint {
    x: number;
    y: number;
}

/** 活跃效果 */
export interface ActiveEffect {
    type: 'speed' | 'slow' | 'double';
    remaining: number;
}
```

```typescript
// src/constants.ts — 所有数值与现有 js/constants.js 完全一致

import type { FoodTypeConfig } from './types';

export const GRID_COUNT = 20;
export const CELL_SIZE = 30;
export const CANVAS_SIZE = GRID_COUNT * CELL_SIZE; // 600
export const TICK_INTERVAL = 180;
export const SCORE_PER_FOOD = 10;
export const HIGH_SCORE_KEY = 'snakeHighScore';
export const MUTE_KEY = 'snakeMuted';
export const SWIPE_THRESHOLD = 30;
export const MOBILE_BREAKPOINT = 768;

export const FoodType: Record<string, FoodTypeConfig> = {
    NORMAL: { name: '普通', color: '#F44336', shape: 'circle',   score: 10, probability: 1.0,  timeout: null, effect: null,     effectDuration: null },
    SPEED:  { name: '加速', color: '#FF9800', shape: 'diamond',  score: 15, probability: 0.15, timeout: 8000, effect: 'speed',  effectDuration: 5000 },
    SLOW:   { name: '减速', color: '#2196F3', shape: 'triangle', score: 15, probability: 0.15, timeout: 8000, effect: 'slow',   effectDuration: 5000 },
    DOUBLE: { name: '双倍', color: '#FFD700', shape: 'star',     score: 20, probability: 0.10, timeout: 8000, effect: 'double', effectDuration: 8000 },
    SHRINK: { name: '缩短', color: '#9C27B0', shape: 'square',   score: 5,  probability: 0.10, timeout: 6000, effect: null,     effectDuration: null },
};
```

## 七、对外接口（模块间接口签名）

### 7.1 Snake

```typescript
// src/objects/Snake.ts
export default class Snake {
    segments: GridPoint[];
    direction: DirectionValue;

    constructor(scene: Phaser.Scene);

    /** 初始化蛇到默认位置（中央，长度3，向右） */
    init(): void;

    /** 获取蛇头位置 */
    getHead(): GridPoint;

    /** 移动蛇，grow=true 时不移除尾部 */
    move(grow: boolean): void;

    /** 设置方向（禁止掉头），返回是否成功 */
    setDirection(newDir: DirectionValue): boolean;

    /** 检测蛇头是否与自身碰撞 */
    checkSelfCollision(): boolean;

    /** 检测指定坐标是否在蛇身上 */
    occupies(point: GridPoint): boolean;

    /** 获取蛇身长度 */
    getLength(): number;

    /** 缩短蛇身（最短保持1节） */
    shrink(count: number): void;

    /** 使用 Phaser Graphics 重绘蛇 */
    draw(): void;

    /** 销毁 Phaser 对象 */
    destroy(): void;
}
```

### 7.2 Food

```typescript
// src/objects/Food.ts
export default class Food {
    position: GridPoint | null;
    type: FoodTypeConfig | null;
    timeRemaining: number | null;

    constructor(scene: Phaser.Scene);

    /** 按概率随机生成食物 */
    spawn(isOccupied: (point: GridPoint) => boolean): void;

    /** 生成指定类型食物 */
    spawnType(isOccupied: (point: GridPoint) => boolean, foodType: FoodTypeConfig): void;

    /** 更新限时倒计时，返回是否超时 */
    updateTimer(deltaMs: number): boolean;

    /** 判断是否处于闪烁隐藏帧 */
    isBlinking(): boolean;

    /** 使用 Phaser Graphics 重绘食物 */
    draw(): void;

    /** 销毁 Phaser 对象 */
    destroy(): void;
}
```

### 7.3 Particle

```typescript
// src/objects/Particle.ts
export default class ParticleEffect {
    constructor(scene: Phaser.Scene);

    /** 在指定网格位置生成粒子特效 */
    spawn(gridX: number, gridY: number, color?: string): void;

    /** 清空所有粒子 */
    clear(): void;

    /** 销毁 Phaser 对象 */
    destroy(): void;
}
```

### 7.4 InputManager

```typescript
// src/managers/InputManager.ts
export default class InputManager {
    constructor(scene: Phaser.Scene);

    /** 初始化键盘、触屏、虚拟方向键输入 */
    init(onAction: () => void, onPause: () => void): void;

    /** 消费并返回待处理的方向输入 */
    consumeDirection(): DirectionValue | null;

    /** 销毁事件监听 */
    destroy(): void;
}
```

### 7.5 SoundManager

```typescript
// src/managers/SoundManager.ts
export default class SoundManager {
    constructor();

    /** 初始化：读取 localStorage 静音状态 */
    init(): void;

    /** 确保 AudioContext 已创建 */
    ensureContext(): void;

    /** 播放吃食物音效 */
    playEat(): void;

    /** 播放游戏结束音效 */
    playGameOver(): void;

    /** 开始背景音乐 */
    startBgm(): void;

    /** 停止背景音乐 */
    stopBgm(): void;

    /** 切换静音 */
    toggleMute(): void;

    /** 获取静音状态 */
    isMuted(): boolean;
}
```

### 7.6 EffectManager

```typescript
// src/managers/EffectManager.ts
export default class EffectManager {
    /** 添加效果（同类型刷新持续时间） */
    add(type: 'speed' | 'slow' | 'double', duration: number): void;

    /** 更新剩余时间，移除过期效果 */
    update(deltaMs: number): void;

    /** 获取 tick 间隔倍率 */
    getSpeedMultiplier(): number;

    /** 获取得分倍率 */
    getScoreMultiplier(): number;

    /** 获取生效效果列表 */
    getActiveEffects(): ActiveEffect[];

    /** 清空所有效果 */
    clear(): void;
}
```

### 7.7 ScoreManager

```typescript
// src/managers/ScoreManager.ts
export default class ScoreManager {
    current: number;
    high: number;

    /** 初始化：从 localStorage 读取最高分 */
    init(): void;

    /** 增加分数（支持倍率） */
    add(baseScore: number, multiplier?: number): void;

    /** 重置当前分数 */
    reset(): void;
}
```

### 7.8 GameScene

```typescript
// src/scenes/GameScene.ts
export default class GameScene extends Phaser.Scene {
    /** Phaser 生命周期：创建游戏对象 */
    create(): void;

    /** Phaser 生命周期：每帧更新（替代原 Game.tick） */
    update(time: number, delta: number): void;
}
```

### 7.9 UIScene

```typescript
// src/scenes/UIScene.ts
export default class UIScene extends Phaser.Scene {
    /** 创建 UI 元素（效果指示器、遮罩文字等） */
    create(): void;

    /** 每帧更新 UI 状态 */
    update(time: number, delta: number): void;
}
```


## 八、模块依赖

```
main.ts
  └── config.ts
        └── GameScene
              ├── Snake (objects)
              ├── Food (objects)
              ├── Particle (objects)
              ├── InputManager (managers)
              ├── SoundManager (managers)
              ├── EffectManager (managers)
              └── ScoreManager (managers)
        └── UIScene
              └── 监听 GameScene 事件
```

| 模块 | 依赖 | 被依赖 |
|------|------|--------|
| `constants.ts` | 无 | 所有模块 |
| `types.ts` | 无 | 所有模块 |
| `config.ts` | constants, GameScene, UIScene | main.ts |
| `main.ts` | config | 无（入口） |
| `GameScene` | Snake, Food, Particle, InputManager, SoundManager, EffectManager, ScoreManager, constants | UIScene（通过事件） |
| `UIScene` | constants | 无 |
| `Snake` | constants, types | GameScene |
| `Food` | constants, types | GameScene |
| `Particle` | constants | GameScene |
| `InputManager` | constants, types | GameScene |
| `SoundManager` | constants | GameScene |
| `EffectManager` | types | GameScene |
| `ScoreManager` | constants | GameScene |

无循环依赖。

## 九、错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| AudioContext 创建失败 | 静默降级，不播放音效 |
| localStorage 不可用 | 静默降级，不持久化分数/静音状态 |
| Phaser 初始化失败 | 控制台输出错误，显示降级提示 |
| 画布 resize 异常 | 使用 Phaser Scale Manager 自动处理 |
| 触屏事件不支持 | Phaser Input 自动检测，不影响键盘操作 |

## 十、Phaser 场景架构详解

### 10.1 双场景设计

采用 GameScene + UIScene 双场景并行运行：

- **GameScene**：负责游戏逻辑和游戏对象渲染（蛇、食物、墙壁、粒子、背景）
- **UIScene**：以覆盖层运行，负责 UI 渲染（效果指示器、暂停/结束遮罩、开始界面文字）

双场景的好处：
1. UI 渲染与游戏逻辑解耦
2. 暂停时可以只停 GameScene 的 update，UIScene 继续响应
3. 遮罩层自然覆盖在游戏画面之上

### 10.2 游戏循环设计

现有项目使用 `setInterval(tick, 180ms)` 实现固定 tick。Phaser 的 `update(time, delta)` 是每帧调用（~60fps）。

**方案：在 Phaser update 中累积 delta，达到 TICK_INTERVAL 时执行一次游戏逻辑 tick。**

```typescript
// GameScene.update 中的 tick 累积逻辑（伪代码）
private tickAccumulator: number = 0;

update(time: number, delta: number): void {
    if (this.state !== GameState.PLAYING) return;

    this.tickAccumulator += delta;
    const currentInterval = TICK_INTERVAL * this.effectManager.getSpeedMultiplier();

    if (this.tickAccumulator >= currentInterval) {
        this.tickAccumulator -= currentInterval;
        this.gameTick(delta); // 执行一次游戏逻辑
    }

    // 每帧都更新的内容：粒子、食物闪烁
    this.food.draw();
}
```

### 10.3 响应式适配

使用 Phaser Scale Manager：

```typescript
// config.ts 中的缩放配置（伪代码）
scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS_SIZE,   // 600
    height: CANVAS_SIZE,  // 600
    max: { width: 1000, height: 1000 },
}
```

Phaser Scale.FIT 会自动将画布缩放到容器大小并保持比例，替代现有 CSS `width: min(90vw, 90vh)` 的方案。

### 10.4 HTML 结构变更

分数面板、静音按钮、虚拟方向键保留为 DOM 元素（不迁入 Phaser UI 系统），理由：
1. DOM 元素的文字渲染更清晰
2. 虚拟方向键需要 touch 事件，DOM 按钮更可靠
3. 减少迁移工作量

```html
<!-- index.html 结构保持不变，仅修改 canvas 部分 -->
<div class="game-container">
    <div class="score-panel">
        <span id="score">分数: 0</span>
        <span id="highScore">最高分: 0</span>
        <button id="muteBtn" class="icon-btn">🔊</button>
    </div>
    <!-- Phaser 会自动创建 canvas 并插入到 parent 容器 -->
    <div id="game-canvas"></div>
    <div id="dpad" class="dpad-container">
        <!-- 虚拟方向键保持不变 -->
    </div>
</div>
<script type="module" src="/src/main.ts"></script>
```

## 十一、迁移顺序与依赖关系

### 11.1 分模块迁移顺序

迁移按依赖关系分层，每层完成后可独立验证：

| 迁移阶段 | 模块 | 验证标准 | 对应子任务 |
|----------|------|----------|------------|
| **阶段1：项目骨架** | Vite + Phaser 初始化、constants.ts、types.ts、config.ts、main.ts | Phaser 画布正常显示，背景色 #0f0f23 | TASK-010 |
| **阶段2：核心玩法** | GameScene（状态管理+游戏循环）、Snake、Food、ScoreManager、EffectManager | 蛇能移动、吃食物、碰撞检测、分数计算、效果系统正常 | TASK-011 |
| **阶段3：输入系统** | InputManager（键盘+触屏+虚拟方向键） | 键盘/触屏/虚拟键均可控制蛇方向，暂停/恢复正常 | TASK-012 |
| **阶段4：视觉与音效** | Particle、SoundManager、UIScene（遮罩+指示器） | 粒子特效、音效、暂停遮罩、游戏结束界面、效果指示器正常 | TASK-013 |
| **阶段5：部署与收尾** | GitHub Actions 更新、响应式适配验证、旧代码清理 | GitHub Pages 部署成功，全功能验证通过 | TASK-014 |

### 11.2 阶段依赖图

```
阶段1（骨架）
    ↓
阶段2（核心玩法）← 依赖阶段1
    ↓
阶段3（输入系统）← 依赖阶段2（需要 GameScene 接收输入）
    ↓
阶段4（视觉与音效）← 依赖阶段2（需要游戏事件触发粒子/音效）
    ↓
阶段5（部署收尾）← 依赖阶段3+4 全部完成
```

> 注意：阶段3 和阶段4 之间无直接依赖，理论上可并行，但考虑到都需要修改 GameScene，建议串行以避免冲突。

## 十二、模块分配表

| 模块 | 负责目录 | 负责角色 | 可读目录 | 禁止触碰 |
|------|----------|----------|---------|----------|
| 项目骨架 | `src/main.ts`, `src/config.ts`, `src/constants.ts`, `src/types.ts`, `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json` | 前端开发 | 全部 src/ | — |
| 核心玩法 | `src/scenes/GameScene.ts`, `src/objects/Snake.ts`, `src/objects/Food.ts`, `src/managers/EffectManager.ts`, `src/managers/ScoreManager.ts` | 前端开发 | 全部 src/ | — |
| 输入系统 | `src/managers/InputManager.ts` | 前端开发 | 全部 src/ | — |
| 视觉与音效 | `src/scenes/UIScene.ts`, `src/objects/Particle.ts`, `src/managers/SoundManager.ts` | 前端开发 | 全部 src/ | — |
| 部署配置 | `.github/workflows/deploy-pages.yml` | 运维 | 全部 | src/ 下所有文件 |

> 本项目为单人前端重构，所有 src/ 代码由同一个前端开发者负责，无并行冲突风险。
> 共享文件 `src/constants.ts`、`src/types.ts` 由前端开发者统一维护。

## 十三、开发层级（L1/L2/L3）

| 层级 | 包含任务 | 说明 |
|------|----------|------|
| L1 | TASK-009（本任务：架构设计） | 无前置依赖 |
| L2 | TASK-010（项目骨架搭建） | 依赖 L1 设计文档 |
| L2 | TASK-011（核心玩法迁移） | 依赖 TASK-010 骨架 |
| L2 | TASK-012（输入系统迁移） | 依赖 TASK-011 核心玩法 |
| L2 | TASK-013（视觉与音效迁移） | 依赖 TASK-011 核心玩法 |
| L2 | TASK-014（部署与收尾） | 依赖 TASK-012 + TASK-013 |

> TASK-010 ~ TASK-014 均为 L2 层级（依赖 L1 设计完成），由 PM 创建具体 Issue。

## 十四、开发者注意事项

1. **Phaser 版本**：使用 `phaser@^3.88.0`（当前最新稳定版 3.90.0），通过 npm 安装
2. **渲染模式**：优先 WebGL，自动降级 Canvas（Phaser 默认行为）
3. **游戏循环**：不要使用 `setInterval`，使用 Phaser `update()` + tick 累积器
4. **坐标系统**：Phaser 坐标原点在左上角，与现有 Canvas 一致，无需转换
5. **音效系统**：保留 Web Audio API 合成，不引入音频文件（PRD 约束）
6. **常量不变**：`constants.ts` 中所有数值必须与 `js/constants.js` 完全一致
7. **视觉一致**：蛇头 #388E3C、背景 #0f0f23/#1a1a2e/#16213e、食物颜色/形状、墙壁 #3a3a5c 等必须与现有版本一致
8. **DOM 元素保留**：分数面板、静音按钮、虚拟方向键保持 DOM 实现，通过 JS 事件桥接到 Phaser
9. **旧代码处理**：迁移完成后删除 `js/` 目录，不保留旧代码
10. **TypeScript 严格模式**：`tsconfig.json` 开启 `strict: true`

