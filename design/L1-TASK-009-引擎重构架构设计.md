# L1 TASK-009 引擎重构架构设计 设计文档

## 一、需求摘要

根据 Issue #44，现有贪吃蛇项目 11 个 JS 模块共 1664 行代码，全部使用原生 Canvas API。需选定 Web 游戏引擎替代手写底层，降低代码复杂度，100% 保留现有功能，部署方式不变（GitHub Pages 静态站点）。

## 二、引擎选型对比

| 维度 | Phaser 3 | PixiJS 8 | Kaplay (原 Kaboom.js) |
|------|----------|----------|----------------------|
| 定位 | 完整游戏框架 | 2D 渲染引擎 | 轻量游戏库 |
| 包体积 (min+gzip) | ~300KB | ~200KB | ~80KB |
| 场景管理 | ✅ 内置 | ❌ 无 | ✅ 内置 |
| 输入系统 | ✅ 键盘/触屏/手柄 | ❌ 仅基础事件 | ✅ 键盘/触屏/手柄 |
| 粒子系统 | ✅ 内置 | ✅ 插件 | ✅ 内置 |
| 音频系统 | ✅ 内置 | ❌ 无 | ✅ 内置 |
| 游戏循环 | ✅ 内置 | ✅ Ticker | ✅ 内置 |
| API 简洁度 | 中等（配置多） | 低（只管渲染） | 高（链式调用，极简） |
| TypeScript 支持 | ✅ | ✅ | ✅ |
| GitHub Pages 兼容 | ✅ | ✅ | ✅ |
| 社区活跃度 | 高（47k⭐） | 高（44k⭐） | 中（4k⭐） |
| 学习成本 | 高 | 中 | 低 |

**选择 Kaplay，理由：**

1. **复杂度最低**（核心目标）：Kaplay 的 API 设计极简，一个 `add()` 创建对象、`onKeyPress()` 处理输入、`scene()` 管理场景，代码量预计减少 40-50%
2. **功能覆盖完整**：内置场景管理、输入系统、粒子系统、游戏循环，贪吃蛇需要的能力全部覆盖
3. **包体积最小**：~80KB gzip，对 GitHub Pages 加载速度影响最小
4. **Phaser 过重**：贪吃蛇不需要物理引擎、Tilemap、Tween 等重量级功能，引入 Phaser 是杀鸡用牛刀
5. **PixiJS 不够**：只是渲染引擎，输入/场景/粒子都要自己写，达不到降低复杂度的目标

> 音效系统：PRD 要求保留 Web Audio API 合成音效（不引入音频文件），因此音效模块保留自定义实现，不使用 Kaplay 音频系统。

## 三、构建与部署方案

### 构建工具

引入 Vite + TypeScript：
- 现有项目为纯 ES Module（`<script type="module">`），无构建工具
- 引入 Kaplay 需要 npm 包管理，Vite 是最轻量的选择
- `npm run build` 输出纯静态文件到 `dist/`，与 GitHub Pages 完全兼容

### 部署流程

GitHub Actions 修改为：
```yaml
# 新增 build 步骤
- run: npm ci
- run: npm run build
# 部署 dist/ 目录
- uses: actions/upload-pages-artifact@v3
  with:
    path: dist
```

### 关键配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',  // GitHub Pages 相对路径
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
})
```

## 四、文件结构

```
snake-game/
├── index.html                    # Vite 入口 HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts                   # 入口：初始化 Kaplay，注册场景，启动
│   ├── constants.ts              # 常量与枚举（从 js/constants.js 迁移）
│   ├── types.ts                  # 全局类型定义
│   ├── scenes/
│   │   └── game.ts               # 游戏主场景（整合状态机 + 游戏循环）
│   ├── objects/
│   │   ├── snake.ts              # 蛇：数据模型 + Kaplay 渲染对象
│   │   ├── food.ts               # 食物：生成逻辑 + Kaplay 渲染对象
│   │   └── wall.ts               # 墙壁：边界渲染
│   └── systems/
│       ├── input.ts              # 输入：键盘/触屏/虚拟方向键
│       ├── effect.ts             # 特效管理：加速/减速/双倍/缩短
│       ├── score.ts              # 分数管理 + localStorage 持久化
│       ├── sound.ts              # 音效：Web Audio API 合成（保留）
│       └── particle.ts           # 粒子：Kaplay 粒子系统封装
├── design/                       # 设计文档（保留）
├── docs/                         # 产品/测试文档（保留）
└── .github/workflows/deploy-pages.yml  # 更新部署流程
```

## 五、模块职责与现有代码映射

| 新模块 | 对应旧文件 | 迁移方式 | 预估行数 |
|--------|-----------|----------|---------|
| `src/constants.ts` | `js/constants.js` (78行) | 直接迁移，加 TS 类型 | ~70 |
| `src/types.ts` | 无 | 新建，集中类型定义 | ~30 |
| `src/main.ts` | `js/main.js` (12行) | 重写为 Kaplay 初始化 | ~30 |
| `src/scenes/game.ts` | `js/game.js` (390行) | 用 Kaplay scene + onUpdate 替代手写循环 | ~150 |
| `src/objects/snake.ts` | `js/snake.js` (114行) | 保留数据逻辑，渲染交给 Kaplay | ~80 |
| `src/objects/food.ts` | `js/food.js` (104行) | 保留生成逻辑，渲染交给 Kaplay | ~70 |
| `src/objects/wall.ts` | `js/renderer.js` 墙壁部分 | 用 Kaplay rect 绘制 | ~20 |
| `src/systems/input.ts` | `js/input.js` (151行) | 用 Kaplay onKeyPress 替代，保留触屏/虚拟键 | ~60 |
| `src/systems/effect.ts` | `js/effect.js` (86行) | 保留逻辑层，加 TS 类型 | ~60 |
| `src/systems/score.ts` | `js/score.js` (80行) | 保留逻辑层，加 TS 类型 | ~50 |
| `src/systems/sound.ts` | `js/sound.js` (174行) | 保留 Web Audio API 实现 | ~120 |
| `src/systems/particle.ts` | `js/particle.js` (80行) | 用 Kaplay 粒子系统替代 | ~30 |
| `js/renderer.js` (395行) | — | **删除**，渲染全部由 Kaplay 接管 | 0 |
| **合计** | **1664行** | | **~770** |

> 预计代码量减少约 50%，主要来自删除 renderer.js（395行）和简化 game.js（390→150行）。

## 六、类型定义

```typescript
// src/types.ts

/** 方向枚举 */
export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

/** 方向到坐标增量的映射 */
export const DIR_VECTORS: Record<Direction, GridPos> = {
  [Direction.UP]:    { x: 0,  y: -1 },
  [Direction.DOWN]:  { x: 0,  y: 1  },
  [Direction.LEFT]:  { x: -1, y: 0  },
  [Direction.RIGHT]: { x: 1,  y: 0  },
}

/** 反方向映射（用于忽略反向输入） */
export const OPPOSITE: Record<Direction, Direction> = {
  [Direction.UP]:    Direction.DOWN,
  [Direction.DOWN]:  Direction.UP,
  [Direction.LEFT]:  Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT,
}

/** 网格坐标 */
export interface GridPos {
  x: number
  y: number
}

/** 游戏状态 */
export enum GameState {
  READY = 'ready',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'gameOver',
  WIN = 'win',
}

/** 食物类型标识 */
export enum FoodKind {
  NORMAL = 'normal',
  SPEED = 'speed',
  SLOW = 'slow',
  DOUBLE = 'double',
  SHRINK = 'shrink',
}

/** 食物类型配置 */
export interface FoodConfig {
  kind: FoodKind
  name: string
  color: string
  shape: 'circle' | 'diamond' | 'triangle' | 'star' | 'square'
  score: number
  probability: number
  timeout: number | null       // 限时毫秒，null 表示不限时
  effect: EffectType | null
  effectDuration: number | null // 效果持续毫秒
}

/** 特效类型 */
export enum EffectType {
  SPEED = 'speed',   // tick ×0.7
  SLOW = 'slow',     // tick ×1.3
  DOUBLE = 'double', // 得分 ×2
}

/** 活跃特效 */
export interface ActiveEffect {
  type: EffectType
  remaining: number  // 剩余毫秒
  duration: number   // 总持续毫秒
}
```

## 七、对外接口（模块间接口签名）

### 7.1 constants.ts — 常量导出

```typescript
export const GRID_COUNT: number           // 20
export const CELL_SIZE: number            // 30
export const CANVAS_SIZE: number          // 600
export const TICK_INTERVAL: number        // 180
export const SCORE_PER_FOOD: number       // 10
export const HIGH_SCORE_KEY: string       // 'snakeHighScore'
export const MUTE_KEY: string             // 'snakeMuted'
export const SWIPE_THRESHOLD: number      // 30
export const MOBILE_BREAKPOINT: number    // 768
export const FOOD_CONFIGS: FoodConfig[]   // 5 种食物配置数组
```

### 7.2 objects/snake.ts

```typescript
/** 蛇数据管理 + Kaplay 渲染 */

/** 初始化蛇（创建 Kaplay 对象，初始 3 格，方向向右） */
export function createSnake(): void

/** 设置方向（自动忽略反方向） */
export function setDirection(dir: Direction): void

/** 获取当前方向 */
export function getDirection(): Direction

/** 获取蛇头网格坐标 */
export function getHead(): GridPos

/** 获取所有蛇身段网格坐标 */
export function getSegments(): GridPos[]

/** 移动蛇（grow=true 时蛇身+1） */
export function move(grow: boolean): void

/** 缩短蛇身（移除尾部 n 格，最少保留 1 格） */
export function shrink(n: number): void

/** 检测自身碰撞 */
export function checkSelfCollision(): boolean

/** 检测指定坐标是否被蛇占据 */
export function occupies(pos: GridPos): boolean

/** 获取蛇身长度 */
export function getLength(): number

/** 销毁所有 Kaplay 对象 */
export function destroy(): void
```

### 7.3 objects/food.ts

```typescript
/** 食物管理 + Kaplay 渲染 */

/** 按概率随机生成食物（避开蛇身） */
export function spawn(isOccupied: (pos: GridPos) => boolean): void

/** 生成指定类型食物 */
export function spawnKind(isOccupied: (pos: GridPos) => boolean, kind: FoodKind): void

/** 获取当前食物位置（无食物返回 null） */
export function getPosition(): GridPos | null

/** 获取当前食物配置 */
export function getConfig(): FoodConfig | null

/** 更新限时倒计时，返回是否已过期 */
export function updateTimer(deltaMs: number): boolean

/** 当前食物是否在闪烁（剩余 ≤3 秒） */
export function isBlinking(): boolean

/** 销毁当前食物 Kaplay 对象 */
export function destroy(): void
```

### 7.4 objects/wall.ts

```typescript
/** 绘制墙壁边界 */
export function createWalls(): void
```

### 7.5 systems/input.ts

```typescript
/** 输入系统：注册 Kaplay 键盘事件 + 触屏 + 虚拟方向键 */

/** 初始化输入系统（注册所有事件监听） */
export function initInput(callbacks: {
  onDirection: (dir: Direction) => void
  onAction: () => void       // 空格/点击
  onTogglePause: () => void  // ESC/P
}): void

/** 清理事件监听 */
export function destroyInput(): void
```

### 7.6 systems/effect.ts

```typescript
/** 特效管理 */

/** 添加特效（同类型覆盖） */
export function addEffect(type: EffectType, durationMs: number): void

/** 更新所有特效剩余时间，自动移除过期特效 */
export function updateEffects(deltaMs: number): void

/** 获取速度倍率（加速 0.7 / 减速 1.3 / 无效果 1.0） */
export function getSpeedMultiplier(): number

/** 获取得分倍率（双倍 2.0 / 无效果 1.0） */
export function getScoreMultiplier(): number

/** 获取所有活跃特效列表 */
export function getActiveEffects(): ActiveEffect[]

/** 清空所有特效 */
export function clearEffects(): void
```

### 7.7 systems/score.ts

```typescript
/** 分数管理 */

/** 初始化（从 localStorage 读取最高分） */
export function initScore(): void

/** 重置当前分数为 0 */
export function resetScore(): void

/** 加分（baseScore × multiplier） */
export function addScore(baseScore: number, multiplier: number): void

/** 获取当前分数 */
export function getCurrentScore(): number

/** 获取最高分 */
export function getHighScore(): number

/** 更新 DOM 显示 */
export function updateDisplay(scoreEl: HTMLElement, highScoreEl: HTMLElement): void
```

### 7.8 systems/sound.ts

```typescript
/** 音效管理（Web Audio API 合成，不引入音频文件） */

/** 初始化（读取 localStorage 静音状态） */
export function initSound(): void

/** 确保 AudioContext 已创建（用户交互时调用） */
export function ensureContext(): void

/** 播放吃食物音效 */
export function playEat(): void

/** 播放游戏结束音效 */
export function playGameOver(): void

/** 开始背景音乐 */
export function startBgm(): void

/** 停止背景音乐 */
export function stopBgm(): void

/** 切换静音 */
export function toggleMute(): void

/** 是否静音 */
export function isMuted(): boolean
```

### 7.9 systems/particle.ts

```typescript
/** 粒子特效（封装 Kaplay 粒子系统） */

/** 在指定网格位置生成吃食物粒子 */
export function spawnEatParticle(gridX: number, gridY: number, color: string): void

/** 生成游戏结束粒子 */
export function spawnGameOverParticle(): void
```

### 7.10 scenes/game.ts

```typescript
/** 游戏主场景 — 注册到 Kaplay scene 系统 */

/** 注册游戏场景（在 main.ts 中调用） */
export function registerGameScene(): void
```

> 场景内部管理 GameState 状态机、tick 循环、模块协调。不对外暴露内部状态。

### 7.11 main.ts

```typescript
/** 入口文件 */
// 1. 调用 kaplay() 初始化引擎
// 2. 调用 registerGameScene()
// 3. 调用 go("game") 启动场景
```

## 八、模块依赖

```
main.ts
  └── scenes/game.ts
        ├── objects/snake.ts    ← constants.ts, types.ts
        ├── objects/food.ts     ← constants.ts, types.ts
        ├── objects/wall.ts     ← constants.ts
        ├── systems/input.ts    ← types.ts
        ├── systems/effect.ts   ← types.ts
        ├── systems/score.ts    ← constants.ts
        ├── systems/sound.ts    ← constants.ts
        └── systems/particle.ts ← constants.ts
```

- 所有模块依赖 `constants.ts` 和 `types.ts`（无循环依赖）
- `scenes/game.ts` 是唯一的协调者，调用所有 objects 和 systems
- objects 和 systems 之间互不依赖

## 九、错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| Kaplay 初始化失败 | 控制台 error 日志，显示降级提示 |
| AudioContext 创建失败 | 静默降级，禁用音效 |
| localStorage 不可用 | catch 后使用内存变量，不持久化 |
| 食物生成无空位（蛇占满网格） | 触发通关状态 |
| 触屏事件不支持 | 仅注册键盘事件，虚拟方向键仍可用 |

## 十、模块分配表

| 模块 | 负责角色 | 负责目录 | 可读目录 | 禁止触碰 |
|------|----------|---------|---------|----------|
| 项目搭建 + 场景框架 | 前端开发A | `src/main.ts`, `src/scenes/`, `src/constants.ts`, `src/types.ts`, `vite.config.ts`, `package.json`, `tsconfig.json`, `index.html` | 全部 src/ | — |
| 蛇 + 食物 + 墙壁 | 前端开发A | `src/objects/` | `src/constants.ts`, `src/types.ts` | `src/systems/` |
| 输入 + 特效 + 分数 | 前端开发B | `src/systems/input.ts`, `src/systems/effect.ts`, `src/systems/score.ts` | `src/constants.ts`, `src/types.ts` | `src/objects/`, `src/scenes/` |
| 音效 + 粒子 | 前端开发B | `src/systems/sound.ts`, `src/systems/particle.ts` | `src/constants.ts`, `src/types.ts` | `src/objects/`, `src/scenes/` |
| GitHub Actions 部署 | 运维 | `.github/workflows/` | `vite.config.ts`, `package.json` | `src/` |

> 共享文件负责人：`src/constants.ts`、`src/types.ts` 由前端开发A 负责，前端开发B 只读。

## 十一、开发层级（L1/L2/L3）与迁移顺序

| 层级 | 任务 | 说明 | 依赖 |
|------|------|------|------|
| L1 | TASK-009: 引擎选型与架构设计（本文档） | 架构师产出 | 无 |
| L2 | TASK-010: 项目搭建与基础框架 | Vite + Kaplay 初始化、constants.ts、types.ts、空场景框架、index.html 改造 | L1 |
| L2 | TASK-011: GitHub Actions 部署更新 | 修改 deploy-pages.yml 支持 Vite 构建 | L1 |
| L3 | TASK-012: 蛇模块迁移 | snake.ts — 数据模型 + Kaplay 渲染 | L2(TASK-010) |
| L3 | TASK-013: 食物与墙壁模块迁移 | food.ts + wall.ts — 生成逻辑 + Kaplay 渲染 | L2(TASK-010) |
| L3 | TASK-014: 输入系统迁移 | input.ts — Kaplay 键盘 + 触屏 + 虚拟方向键 | L2(TASK-010) |
| L3 | TASK-015: 特效与分数系统迁移 | effect.ts + score.ts | L2(TASK-010) |
| L3 | TASK-016: 音效与粒子系统迁移 | sound.ts + particle.ts | L2(TASK-010) |
| L4 | TASK-017: 游戏场景集成 | game.ts — 整合所有模块，实现完整游戏循环 | L3(全部) |
| L5 | TASK-018: 集成测试与视觉验收 | 功能 1:1 对比验证 | L4 |

> L3 层的 TASK-012 ~ TASK-016 可并行开发，各模块按设计文档接口签名独立实现。

## 十二、Kaplay 核心 API 使用说明（开发者参考）

```typescript
import kaplay from 'kaplay'

// 初始化
const k = kaplay({
  width: 600,
  height: 600,
  background: [15, 15, 35],  // #0f0f23
  canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
  global: false,  // 不污染全局，通过 k.xxx 调用
})

// 场景
k.scene('game', () => {
  // 场景内容...
  k.onUpdate(() => { /* 每帧执行 */ })
  k.onDraw(() => { /* 自定义绘制 */ })
})
k.go('game')

// 创建游戏对象（矩形）
const obj = k.add([
  k.rect(30, 30),
  k.pos(100, 100),
  k.color(56, 142, 60),  // #388E3C
])

// 键盘输入
k.onKeyPress('up', () => { /* ... */ })
k.onKeyPress('space', () => { /* ... */ })

// 每帧更新
k.onUpdate(() => {
  // deltaTime 自动可用
})
```

## 十三、HTML 结构变更

分数面板、静音按钮、虚拟方向键保留为 DOM 元素（不迁入引擎 UI），理由：
1. 这些 UI 元素已有完善的 CSS 响应式布局
2. DOM 操作比引擎内绘制文字更简单
3. 无需重写 CSS 样式

变更点：
- `<script type="module" src="js/main.js">` → `<script type="module" src="/src/main.ts">`（Vite 开发模式直接引用 TS）
- Canvas 元素保留，由 Kaplay 接管渲染

## 十四、开发者注意事项

1. **Kaplay `global: false` 模式**：所有 Kaplay API 通过返回的实例 `k` 调用（`k.add()`, `k.onKeyPress()` 等），不污染全局命名空间。需要将 `k` 实例传递给各模块或通过单例导出
2. **网格坐标 → 像素坐标转换**：所有游戏逻辑使用网格坐标（0-19），渲染时乘以 `CELL_SIZE` 转为像素。此转换在各 objects 模块内部完成
3. **音效保留 Web Audio API**：不使用 Kaplay 音频系统，`sound.ts` 基本保留现有实现，仅加 TypeScript 类型
4. **食物形状绘制**：Kaplay 内置 `rect`/`circle`，菱形/三角/星形需用 `k.onDraw()` 自定义绘制，参考现有 `renderer.js` 的 `drawFood()` 方法
5. **粒子系统**：优先使用 Kaplay 内置粒子能力；若表现力不足，可用 `k.onDraw()` + 手动管理粒子数组（类似现有实现但代码更少）
6. **旧代码保留**：`js/` 目录在迁移完成并验收通过前不删除，便于对比验证
