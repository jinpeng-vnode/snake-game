# L1 TASK-020 PixiJS 迁移架构设计 设计文档

## 一、需求摘要

根据 Issue #59（父任务 #58），将贪吃蛇游戏引擎从 Kaplay（kaplay@3001.0.19）替换为 PixiJS v8。这是纯引擎替换，所有功能 1:1 保留，用户无感知切换。PixiJS 是纯渲染引擎，不内置场景管理、输入系统、粒子系统，需要设计补充方案。

PRD 文档：`docs/产品/L1-TASK-019-PixiJS引擎迁移-PRD.md`
上一轮架构：`design/L1-TASK-009-引擎重构架构设计.md`

## 二、方案选择

### 2.1 场景管理方案

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A | Container 替代场景 | PixiJS 原生，零依赖，本游戏只有一个场景 | 需手动管理生命周期 |
| B | 第三方场景管理库 | 功能完善 | 额外依赖，过度设计 |

**选择方案 A，理由：本游戏只有一个游戏场景，用 Container 组织显示对象即可，无需场景切换机制。**

### 2.2 粒子系统方案

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A | @momer/pixi-particle-emitter | 功能丰富，支持 PixiJS v8 | 额外依赖，粒子效果简单不需要 |
| B | 手动管理粒子数组 + Graphics 渲染 | 零依赖，当前 Kaplay 版本就是手动实现 | 功能有限 |

**选择方案 B，理由：当前粒子效果极简（6-9 个圆形粒子扩散），手动实现代码量极小，无需引入额外依赖。**

### 2.3 输入系统方案

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A | 原生 DOM 事件（keydown + touch） | 零依赖，完全控制 | 需自行处理按键映射 |
| B | PixiJS EventSystem | 内置交互事件 | 仅支持显示对象上的事件，不适合全局键盘监听 |

**选择方案 A，理由：PixiJS 的 EventSystem 不支持全局键盘事件，键盘/触屏/虚拟方向键都需要 DOM 事件。现有触屏和虚拟方向键代码已经是 DOM 事件实现，迁移量最小。**

## 三、技术栈变更

| 项目 | 迁移前 | 迁移后 |
|------|--------|--------|
| 渲染引擎 | kaplay@3001.0.19 | pixi.js@^8.x（最新稳定版） |
| 构建工具 | Vite + TypeScript | 不变 |
| 部署 | GitHub Pages | 不变 |
| 音效 | Web Audio API | 不变 |
| 额外依赖 | 无 | 无（不引入粒子库） |

### package.json 变更

```json
{
  "dependencies": {
    "pixi.js": "^8.6.0"
  }
}
```

移除 `"kaplay": "3001.0.19"`。

## 四、文件结构

```
src/
├── main.ts                   # 入口：异步初始化 PixiJS Application，启动游戏
├── engine.ts                 # PixiJS Application 单例导出
├── constants.ts              # 常量（保留不变）
├── types.ts                  # 类型定义（保留业务类型，移除 Kaplay 类型）
├── scenes/
│   └── game.ts               # 游戏主场景（Container 管理 + ticker 游戏循环）
├── objects/
│   ├── snake.ts              # 蛇：数据模型 + PixiJS Graphics 渲染
│   ├── food.ts               # 食物：生成逻辑 + PixiJS Graphics 渲染
│   └── wall.ts               # 墙壁：PixiJS Graphics 边界渲染
└── systems/
    ├── input.ts              # 输入：原生 DOM keydown + 触屏 + 虚拟方向键
    ├── effect.ts             # 特效管理（保留不变，无引擎依赖）
    ├── score.ts              # 分数管理（保留不变，无引擎依赖）
    ├── sound.ts              # 音效（保留不变，无引擎依赖）
    └── particle.ts           # 粒子：手动管理 + PixiJS Graphics 渲染
```

> 目录结构与 Kaplay 版本完全一致，仅替换内部引擎调用。

## 五、Kaplay API → PixiJS v8 API 映射对照表

| Kaplay API | PixiJS v8 替代 | 说明 |
|------------|---------------|------|
| `kaplay({ width, height, background, canvas })` | `new Application()` + `await app.init({ width, height, background, canvas })` | v8 必须异步初始化 |
| `k.scene('name', fn)` + `k.go('name')` | 直接调用函数，用 Container 组织 | 本游戏只有一个场景 |
| `k.onUpdate(fn)` | `app.ticker.add(fn)` | ticker 回调参数为 `Ticker` 对象，用 `ticker.deltaMS` 获取毫秒增量 |
| `k.add([k.rect(w,h), k.pos(x,y), k.color(r,g,b), k.z(n)])` | `new Graphics().roundRect(x,y,w,h,r).fill(color)` + `container.addChild(g)` | Graphics 链式 API |
| `k.add([k.circle(r), k.pos(x,y), ...])` | `new Graphics().circle(x,y,r).fill(color)` | |
| `k.add([k.text(str, {size}), k.pos(x,y), k.anchor('center'), k.color(r,g,b)])` | `new Text({ text, style: { fontSize, fill, fontFamily } })` + 设置 `anchor` | Text 对象 |
| `k.drawRect({ pos, width, height, color, opacity })` | 预构建 Graphics 对象 | v8 不支持即时绘制，需预构建 |
| `k.drawCircle({ pos, radius, color, opacity })` | 预构建 Graphics 对象 | 同上 |
| `k.drawPolygon({ pts, color })` | `new Graphics().poly(points).fill(color)` | |
| `k.drawText({ text, pos, size, color })` | `new Text(...)` | |
| `k.destroy(obj)` | `obj.removeFromParent()` + `obj.destroy()` | |
| `k.vec2(x, y)` | `{ x, y }` 或直接传参 | PixiJS 接受 x,y 分开传参 |
| `k.rgb(r, g, b)` | `(r << 16) + (g << 8) + b` 或十六进制字符串 | PixiJS 接受多种颜色格式 |
| `k.onKeyPress(key, fn)` | `document.addEventListener('keydown', fn)` | 原生 DOM 事件 |
| `k.dt()` | `app.ticker.deltaMS / 1000` | ticker 提供毫秒增量 |
| `obj.hidden = true` | `obj.visible = false` | 属性名不同 |
| `k.z(n)` 组件 | `obj.zIndex = n` + 父容器 `sortableChildren = true` | |

## 六、PixiJS v8 初始化方案

### engine.ts — PixiJS Application 单例

```typescript
// src/engine.ts — PixiJS Application 单例
import { Application } from 'pixi.js'

// PixiJS v8 必须异步初始化，导出 Application 实例和初始化函数
let app: Application

/** 初始化 PixiJS Application（必须在使用前调用） */
export async function initEngine(canvas: HTMLCanvasElement, width: number, height: number): Promise<Application> {
  app = new Application()
  await app.init({
    canvas,
    width,
    height,
    background: '#0f0f23',
    antialias: false,
    resolution: 1,
    autoDensity: false,
  })
  // 启用 zIndex 排序
  app.stage.sortableChildren = true
  return app
}

/** 获取已初始化的 Application 实例 */
export function getApp(): Application {
  return app
}
```

### main.ts — 异步入口

```typescript
// src/main.ts — 入口文件
import { initEngine } from './engine'
import { CANVAS_SIZE } from './constants'
import { startGame } from './scenes/game'

async function main(): Promise<void> {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
  const app = await initEngine(canvas, CANVAS_SIZE, CANVAS_SIZE)
  startGame(app)
}

main()
```

> 关键变更：Kaplay 是同步初始化，PixiJS v8 必须 `await app.init()`。入口函数改为 async。

## 七、场景管理方案

Kaplay 使用 `k.scene('game', fn)` + `k.go('game')` 管理场景。PixiJS 无内置场景系统。

### 替代方案：Container 层级管理

本游戏只有一个场景（game），不需要场景切换。用 Container 分层组织显示对象：

```
app.stage (sortableChildren = true)
├── bgLayer (Container, zIndex=0)      — 棋盘格背景
├── wallLayer (Container, zIndex=1)    — 墙壁边界
├── foodLayer (Container, zIndex=2)    — 食物
├── snakeLayer (Container, zIndex=3)   — 蛇
├── particleLayer (Container, zIndex=4) — 粒子特效
├── uiLayer (Container, zIndex=5)      — 特效指示器
└── overlayLayer (Container, zIndex=6)  — 遮罩层 + 状态文字
```

### scenes/game.ts 改造要点

```typescript
// 不再用 k.scene() 注册，改为直接导出启动函数
export function startGame(app: Application): void {
  // 创建层级容器
  const bgLayer = new Container()
  bgLayer.zIndex = 0
  app.stage.addChild(bgLayer)
  // ... 其他层级

  // 游戏循环用 app.ticker
  app.ticker.add((ticker) => {
    if (state !== GameState.PLAYING) return
    const deltaMs = ticker.deltaMS
    // ... 游戏逻辑
  })
}
```

### 重置游戏

Kaplay 通过 `k.go('game')` 重新进入场景实现重置。PixiJS 替代方案：

```typescript
function resetGame(): void {
  // 清除所有动态层的子对象
  snakeLayer.removeChildren()
  foodLayer.removeChildren()
  particleLayer.removeChildren()
  uiLayer.removeChildren()
  overlayLayer.removeChildren()
  // 重新初始化游戏状态
  // ...
}
```

## 八、类型定义变更

`src/types.ts` 保留所有业务类型（Direction、GameState、FoodKind、GridPos、FoodConfig、EffectType、ActiveEffect），不变。

移除所有 `import type { GameObj } from 'kaplay'` 引用。各模块中原来用 `GameObj` 的地方改为 PixiJS 类型：

| 原类型 | 替换为 | 说明 |
|--------|--------|------|
| `GameObj` | `Container` | 通用显示对象容器 |
| `GameObj` (Graphics) | `Graphics` | 图形绘制对象 |
| `GameObj` (Text) | `Text` | 文字对象 |

所有 PixiJS 类型从 `pixi.js` 包导入：

```typescript
import { Application, Container, Graphics, Text } from 'pixi.js'
```

## 九、各模块对外接口签名

> 接口签名与 Kaplay 版本保持一致，仅变更引擎相关参数。无引擎依赖的模块（effect.ts、score.ts、sound.ts）接口完全不变。

### 9.1 engine.ts

```typescript
import { Application } from 'pixi.js'

/** 初始化 PixiJS Application */
export async function initEngine(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): Promise<Application>

/** 获取已初始化的 Application 实例 */
export function getApp(): Application
```

### 9.2 objects/snake.ts

```typescript
import { Container } from 'pixi.js'

/** 初始化蛇（3 格，方向向右），渲染到指定容器 */
export function createSnake(layer: Container): void

/** 设置方向（忽略反方向） */
export function setDirection(dir: Direction): void

/** 获取当前方向 */
export function getDirection(): Direction

/** 获取蛇头网格坐标 */
export function getHead(): GridPos

/** 获取所有蛇身段网格坐标 */
export function getSegments(): GridPos[]

/** 移动蛇（grow=true 时蛇身+1） */
export function move(grow: boolean): void

/** 缩短蛇身（最少保留 1 格） */
export function shrink(n: number): void

/** 检测自身碰撞 */
export function checkSelfCollision(): boolean

/** 检测指定坐标是否被蛇占据 */
export function occupies(pos: GridPos): boolean

/** 获取蛇身长度 */
export function getLength(): number

/** 检测蛇头是否超出网格边界 */
export function checkWallCollision(): boolean

/** 销毁所有渲染对象 */
export function destroy(): void
```

> 变更点：`createSnake()` 新增 `layer: Container` 参数，指定渲染目标容器。内部用 `layer.addChild()` 替代 `k.add()`。

### 9.3 objects/food.ts

```typescript
import { Container } from 'pixi.js'

/** 按概率随机生成食物 */
export function spawn(layer: Container, isOccupied: (pos: GridPos) => boolean): void

/** 生成指定类型食物 */
export function spawnKind(layer: Container, isOccupied: (pos: GridPos) => boolean, kind: FoodKind): void

/** 获取当前食物位置 */
export function getPosition(): GridPos | null

/** 获取当前食物配置 */
export function getConfig(): FoodConfig | null

/** 更新限时倒计时，返回是否已过期 */
export function updateTimer(deltaMs: number): boolean

/** 当前食物是否在闪烁 */
export function isBlinking(): boolean

/** 设置食物可见性 */
export function setVisible(visible: boolean): void

/** 销毁当前食物渲染对象 */
export function destroy(): void
```

> 变更点：`spawn()` 和 `spawnKind()` 新增 `layer: Container` 参数。

### 9.4 objects/wall.ts

```typescript
import { Container } from 'pixi.js'

/** 绘制墙壁边界到指定容器 */
export function createWalls(layer: Container): void
```

> 变更点：新增 `layer: Container` 参数。

### 9.5 systems/input.ts

```typescript
/** 输入回调接口 */
interface InputCallbacks {
  onDirection: (dir: Direction) => void
  onAction: () => void
  onTogglePause: () => void
}

/** 初始化输入系统（注册 DOM 事件） */
export function initInput(callbacks: InputCallbacks): void

/** 清理所有事件监听 */
export function destroyInput(): void
```

> 变更点：内部实现从 `k.onKeyPress()` 改为 `document.addEventListener('keydown')`。接口签名不变。

### 9.6 systems/effect.ts — 不变

```typescript
export function addEffect(type: EffectType, durationMs: number): void
export function updateEffects(deltaMs: number): void
export function getSpeedMultiplier(): number
export function getScoreMultiplier(): number
export function getActiveEffects(): ActiveEffect[]
export function clearEffects(): void
```

### 9.7 systems/score.ts — 不变

```typescript
export function initScore(): void
export function resetScore(): void
export function addScore(baseScore: number, multiplier: number): void
export function getCurrentScore(): number
export function getHighScore(): number
export function updateDisplay(scoreEl: HTMLElement, highScoreEl: HTMLElement): void
```

### 9.8 systems/sound.ts — 不变

```typescript
export function initSound(): void
export function ensureContext(): void
export function playEat(): void
export function playGameOver(): void
export function startBgm(): void
export function stopBgm(): void
export function toggleMute(): void
export function isMuted(): boolean
```

### 9.9 systems/particle.ts

```typescript
import { Container } from 'pixi.js'

/** 初始化粒子系统（传入渲染容器） */
export function initParticle(layer: Container): void

/** 在指定网格位置生成吃食物粒子 */
export function spawnEatParticle(gridX: number, gridY: number, color: string): void

/** 生成游戏结束粒子 */
export function spawnGameOverParticle(): void

/** 更新粒子状态（每帧调用） */
export function updateParticles(deltaMs: number): void
```

> 变更点：
> 1. 新增 `initParticle(layer)` 初始化函数，传入渲染容器
> 2. 新增 `updateParticles(deltaMs)` 函数，由 game.ts 的 ticker 每帧调用（Kaplay 版本用组件 update 钩子自动更新，PixiJS 需要显式调用）

### 9.10 scenes/game.ts

```typescript
import { Application } from 'pixi.js'

/** 启动游戏（初始化所有模块，开始游戏循环） */
export function startGame(app: Application): void
```

> 变更点：从 `registerGameScene()` 改为 `startGame(app)`。不再注册 Kaplay 场景，直接启动。

## 十、各模块迁移详细说明

### 10.1 engine.ts（重写）

| 项目 | Kaplay | PixiJS |
|------|--------|--------|
| 初始化 | `kaplay({ ... })` 同步 | `new Application()` + `await app.init()` 异步 |
| 导出 | `export default k` | `export { initEngine, getApp }` |
| Canvas 接管 | `canvas` 选项 | `canvas` 选项（相同） |
| 背景色 | `background: [15, 15, 35]` | `background: '#0f0f23'` |

### 10.2 main.ts（重写）

- 改为 `async function main()` 入口
- `await initEngine()` 替代同步 `import k`
- `startGame(app)` 替代 `registerGameScene()` + `k.go('game')`

### 10.3 objects/snake.ts（重写渲染层）

数据层（segments 数组、方向管理、碰撞检测）完全保留。

渲染层变更：

| Kaplay | PixiJS |
|--------|--------|
| `k.add([k.rect(w,h,{radius}), k.pos(x,y), k.color(r,g,b), k.z(4)])` | `new Graphics().roundRect(x,y,w,h,radius).fill(rgbToHex(r,g,b))` + `layer.addChild(g)` |
| `k.add([k.circle(r), k.pos(x,y), k.anchor('center'), k.color(0,0,0)])` | `new Graphics().circle(x,y,r).fill(0x000000)` |
| `k.destroy(obj)` | `obj.removeFromParent(); obj.destroy()` |

`syncRender()` 内部逻辑不变（清除旧对象 → 遍历 segments → 创建渲染对象），仅替换 API 调用。

### 10.4 objects/food.ts（重写渲染层）

数据层（位置、配置、计时器）完全保留。

渲染层变更：

| 形状 | Kaplay | PixiJS |
|------|--------|--------|
| circle | `k.add([k.circle(8), ...])` | `new Graphics().circle(cx,cy,8).fill(color)` |
| square | `k.add([k.rect(14,14), ...])` | `new Graphics().rect(cx-7,cy-7,14,14).fill(color)` |
| diamond | `k.drawPolygon({ pts: [...], color })` | `new Graphics().poly([...]).fill(color)` |
| triangle | `k.drawPolygon({ pts: [...], color })` | `new Graphics().poly([...]).fill(color)` |
| star | `k.drawPolygon({ pts: [...], color })` | `new Graphics().star(cx,cy,5,9,4).fill(color)` |

> PixiJS v8 Graphics 内置 `.star(x, y, points, radius, innerRadius)` 方法，可直接绘制星形，无需手动计算顶点。

闪烁实现：`foodObj.visible = !isBlinking()` 替代 `foodObj.hidden = !visible`。

### 10.5 objects/wall.ts（重写）

```typescript
// Kaplay: 4 个 k.add([k.rect(), k.pos(), k.color(), k.z()])
// PixiJS: 1 个 Graphics 对象绘制 4 条边
export function createWalls(layer: Container): void {
  const g = new Graphics()
  // 上
  g.rect(0, 0, CANVAS_SIZE, 4).fill(0x3a3a5c)
  // 下
  g.rect(0, CANVAS_SIZE - 4, CANVAS_SIZE, 4).fill(0x3a3a5c)
  // 左
  g.rect(0, 0, 4, CANVAS_SIZE).fill(0x3a3a5c)
  // 右
  g.rect(CANVAS_SIZE - 4, 0, 4, CANVAS_SIZE).fill(0x3a3a5c)
  layer.addChild(g)
}
```

> 优化：Kaplay 版本创建 4 个独立对象，PixiJS 可用 1 个 Graphics 对象绘制全部墙壁。

### 10.6 systems/input.ts（重写键盘部分）

触屏滑动和虚拟方向键代码已经是原生 DOM 事件，基本保留。

键盘部分变更：

```typescript
// Kaplay:
// k.onKeyPress('up', () => callbacks.onDirection(Direction.UP))

// PixiJS 替代（原生 DOM）:
const KEY_MAP: Record<string, Direction | 'action' | 'pause'> = {
  ArrowUp: Direction.UP, ArrowDown: Direction.DOWN,
  ArrowLeft: Direction.LEFT, ArrowRight: Direction.RIGHT,
  w: Direction.UP, s: Direction.DOWN,
  a: Direction.LEFT, d: Direction.RIGHT,
  W: Direction.UP, S: Direction.DOWN,
  A: Direction.LEFT, D: Direction.RIGHT,
}

function handleKeyDown(e: KeyboardEvent): void {
  const mapped = KEY_MAP[e.key]
  if (mapped) { callbacks.onDirection(mapped as Direction); return }
  if (e.key === ' ') { callbacks.onAction(); return }
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { callbacks.onTogglePause() }
}

document.addEventListener('keydown', handleKeyDown)
```

`destroyInput()` 需要 `document.removeEventListener('keydown', handleKeyDown)` 正确清理。

### 10.7 systems/particle.ts（重写）

Kaplay 版本用组件的 `draw()` 和 `update()` 钩子。PixiJS 替代方案：

```typescript
// 粒子数据结构不变
interface Particle {
  x: number; y: number
  vx: number; vy: number
  alpha: number; life: number
  color: number  // 新增：支持不同颜色
}

let particles: Particle[] = []
let layer: Container

export function initParticle(container: Container): void {
  layer = container
}

export function updateParticles(deltaMs: number): void {
  // 清除上一帧的 Graphics
  layer.removeChildren()
  // 更新粒子状态
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    p.life--
    p.alpha = p.life / 15
    if (p.life <= 0) { particles.splice(i, 1); continue }
    // 绘制粒子
    const g = new Graphics().circle(p.x, p.y, 3).fill({ color: p.color, alpha: p.alpha })
    layer.addChild(g)
  }
}
```

> 注意：每帧重建 Graphics 对象。粒子数量极少（最多 ~10 个），性能无影响。如需优化可用单个 Graphics 对象绘制所有粒子。

### 10.8 scenes/game.ts（重写）

这是改动最大的文件。核心变更：

| 功能 | Kaplay | PixiJS |
|------|--------|--------|
| 场景注册 | `k.scene('game', fn)` | 直接 `startGame(app)` |
| 游戏循环 | `k.onUpdate(fn)` | `app.ticker.add(fn)` |
| 创建对象 | `k.add([...])` | `new Graphics/Text(...)` + `container.addChild()` |
| 销毁对象 | `k.destroy(obj)` | `obj.removeFromParent(); obj.destroy()` |
| 棋盘格 | 400 个 `k.add([k.rect()])` | 400 个 Graphics 或 1 个大 Graphics |
| 遮罩层 | `k.add([k.rect(), k.opacity(0.5)])` | `new Graphics().rect().fill({ color: 0x000000, alpha: 0.5 })` |
| 文字 | `k.add([k.text(), k.anchor('center')])` | `new Text({ text, style })` + `text.anchor.set(0.5)` |
| 特效指示器 | `k.drawRect()` + `k.drawText()` 即时绘制 | 预构建 Graphics + Text 对象 |

#### 棋盘格背景优化

Kaplay 版本创建 400 个独立矩形对象。PixiJS 优化为 1 个 Graphics 对象：

```typescript
function drawCheckerboard(layer: Container): void {
  const g = new Graphics()
  for (let y = 0; y < GRID_COUNT; y++) {
    for (let x = 0; x < GRID_COUNT; x++) {
      const isLight = (x + y) % 2 === 0
      const color = isLight ? 0x1a1a2e : 0x16213e
      g.rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE).fill(color)
    }
  }
  layer.addChild(g)
}
```

#### 特效指示器

Kaplay 版本用 `draw()` 钩子即时绘制。PixiJS 需要预构建对象：

```typescript
function updateEffectIndicators(uiLayer: Container): void {
  uiLayer.removeChildren()
  const effects = getActiveEffects()
  if (effects.length === 0) return

  // 为每个效果创建背景 Graphics + Text 对象
  // ... 添加到 uiLayer
}
```

#### 遮罩层与状态文字

```typescript
function drawOverlay(overlayLayer: Container): void {
  const bg = new Graphics()
    .rect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    .fill({ color: 0x000000, alpha: 0.5 })
  overlayLayer.addChild(bg)
}

function drawReadyScreen(overlayLayer: Container): void {
  const title = new Text({
    text: '贪吃蛇',
    style: { fontSize: Math.floor(CANVAS_SIZE / 8.33), fill: 0xffffff, fontFamily: 'Arial' }
  })
  title.anchor.set(0.5)
  title.position.set(CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 40)
  overlayLayer.addChild(title)
  // ... hint 文字类似
}
```

## 十一、模块依赖图

```
main.ts
  ├── engine.ts (initEngine)
  ├── constants.ts (CANVAS_SIZE)
  └── scenes/game.ts (startGame)
        ├── engine.ts (getApp) — 仅在需要时获取 app 引用
        ├── constants.ts
        ├── types.ts
        ├── objects/snake.ts    ← constants.ts, types.ts
        ├── objects/food.ts     ← constants.ts, types.ts
        ├── objects/wall.ts     ← constants.ts
        ├── systems/input.ts    ← types.ts, constants.ts
        ├── systems/effect.ts   ← types.ts（无引擎依赖）
        ├── systems/score.ts    ← constants.ts（无引擎依赖）
        ├── systems/sound.ts    ← constants.ts（无引擎依赖）
        └── systems/particle.ts ← constants.ts
```

- 所有模块依赖 `constants.ts` 和/或 `types.ts`（无循环依赖）
- `scenes/game.ts` 是唯一的协调者
- objects 和 systems 之间互不依赖
- `engine.ts` 不再被 objects/systems 直接 import（Kaplay 版本每个模块都 `import k from '../engine'`，PixiJS 版本通过参数传入 Container）

## 十二、错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| PixiJS Application 初始化失败（WebGL 不支持） | catch 后在页面显示降级提示文字 |
| AudioContext 创建失败 | 静默降级，禁用音效（不变） |
| localStorage 不可用 | catch 后使用内存变量（不变） |
| 食物生成无空位 | 触发通关状态（不变） |
| Canvas 元素不存在 | 控制台 error，终止初始化 |
| Graphics 对象销毁后重复操作 | try-catch 包裹 destroy 调用 |

## 十三、模块分配表

本次迁移由单个前端开发者完成（所有模块耦合度高，不适合拆分给多人并行）。

| 模块 | 负责角色 | 负责文件 | 可读文件 |
|------|----------|---------|---------|
| 引擎初始化 + 入口 | 前端开发 | `src/engine.ts`, `src/main.ts`, `package.json`, `index.html` | 全部 |
| 游戏场景 | 前端开发 | `src/scenes/game.ts` | 全部 |
| 游戏对象 | 前端开发 | `src/objects/snake.ts`, `src/objects/food.ts`, `src/objects/wall.ts` | 全部 |
| 输入 + 粒子 | 前端开发 | `src/systems/input.ts`, `src/systems/particle.ts` | 全部 |
| 类型定义 | 前端开发 | `src/types.ts` | 全部 |
| 常量 | 前端开发 | `src/constants.ts`（仅移除 Kaplay import 如有） | 全部 |
| 无变更模块 | — | `src/systems/effect.ts`, `src/systems/score.ts`, `src/systems/sound.ts` | — |
| 部署配置 | 运维 | `.github/workflows/deploy-pages.yml` | `package.json` |

> 共享文件负责人：所有 `src/` 文件由前端开发统一负责。
> `effect.ts`、`score.ts`、`sound.ts` 无引擎依赖，无需修改。`constants.ts` 无需修改（不依赖 Kaplay）。

## 十四、开发层级（L1/L2/L3）

| 层级 | 包含任务 | 说明 | 依赖 |
|------|----------|------|------|
| L1 | TASK-020: PixiJS 迁移架构设计（本文档） | 架构师产出 | 无 |
| L2 | TASK-021: PixiJS 引擎初始化与基础框架 | `engine.ts` + `main.ts` + `package.json` 替换 + 空场景框架 + 棋盘格 + 墙壁 | L1 |
| L2 | TASK-022: 输入系统迁移 | `input.ts` 从 Kaplay 键盘事件改为原生 DOM 事件 | L1 |
| L3 | TASK-023: 蛇模块迁移 | `snake.ts` 渲染层替换为 PixiJS Graphics | L2(TASK-021) |
| L3 | TASK-024: 食物模块迁移 | `food.ts` 渲染层替换为 PixiJS Graphics | L2(TASK-021) |
| L3 | TASK-025: 粒子系统迁移 | `particle.ts` 替换为 PixiJS Graphics 手动粒子 | L2(TASK-021) |
| L4 | TASK-026: 游戏场景集成 | `game.ts` 整合所有模块，Container 层级管理，ticker 游戏循环，遮罩/文字/指示器 | L3(全部) + L2(TASK-022) |
| L5 | TASK-027: 集成验收与清理 | 功能 1:1 验证，移除 Kaplay 残留，`npm run build` 通过 | L4 |

> L2 的 TASK-021 和 TASK-022 可并行开发。
> L3 的 TASK-023、TASK-024、TASK-025 可并行开发。
> effect.ts、score.ts、sound.ts 无需迁移任务。

## 十五、迁移影响评估

| 文件 | 迁移影响 | 工作量 |
|------|----------|--------|
| `src/engine.ts` | 完全重写 | 小 |
| `src/main.ts` | 完全重写 | 小 |
| `src/types.ts` | 移除 Kaplay 类型引用（如有） | 极小 |
| `src/constants.ts` | 不变 | 无 |
| `src/scenes/game.ts` | 完全重写（改动最大） | 大 |
| `src/objects/snake.ts` | 数据层保留，渲染层重写 | 中 |
| `src/objects/food.ts` | 数据层保留，渲染层重写 | 中 |
| `src/objects/wall.ts` | 完全重写 | 小 |
| `src/systems/input.ts` | 键盘部分重写，触屏/虚拟键保留 | 小 |
| `src/systems/effect.ts` | 不变 | 无 |
| `src/systems/score.ts` | 不变 | 无 |
| `src/systems/sound.ts` | 不变 | 无 |
| `src/systems/particle.ts` | 完全重写 | 小 |
| `package.json` | 替换依赖 | 极小 |
| `index.html` | 不变 | 无 |

## 十六、开发者注意事项

1. **PixiJS v8 异步初始化**：`Application` 必须 `await app.init()` 后才能使用。`main.ts` 入口函数必须是 async。
2. **不再全局导入引擎实例**：Kaplay 版本每个模块 `import k from '../engine'`。PixiJS 版本通过函数参数传入 `Container`，降低模块耦合。
3. **Graphics 是构建器模式**：`.rect()` / `.circle()` 不会立即绘制，而是存储几何数据。必须 `addChild()` 到场景后才渲染。
4. **不要每帧重建 Graphics**：对于静态对象（棋盘格、墙壁），创建一次即可。仅蛇和粒子需要每次状态变化时重建。
5. **zIndex 排序**：父容器必须设置 `sortableChildren = true`，子对象的 `zIndex` 才生效。
6. **Text 对象的 anchor**：PixiJS 的 `Text.anchor` 是 `ObservablePoint`，用 `.set(0.5)` 设置居中，不是 Kaplay 的 `k.anchor('center')` 字符串。
7. **颜色格式**：PixiJS v8 接受多种格式：十六进制数字 `0xff0000`、字符串 `'#ff0000'`、CSS 颜色名。推荐用十六进制数字。
8. **ticker.deltaMS**：`app.ticker.add(fn)` 的回调参数是 `Ticker` 对象，用 `ticker.deltaMS` 获取毫秒增量（Kaplay 的 `k.dt()` 返回秒）。
9. **对象销毁**：PixiJS 的 `destroy()` 不会自动从父容器移除，需先 `removeFromParent()` 或用 `destroy({ children: true })` 递归销毁。清除容器所有子对象用 `container.removeChildren()`。
10. **constants.ts 和 types.ts 不变**：这两个文件不依赖 Kaplay，无需修改。`types.ts` 中如果有 `import type { GameObj } from 'kaplay'` 需要移除（当前版本没有）。
11. **食物星形**：PixiJS v8 Graphics 内置 `.star(x, y, points, outerRadius, innerRadius)` 方法，无需手动计算星形顶点。
12. **半透明填充**：PixiJS v8 的 `.fill({ color, alpha })` 支持透明度，替代 Kaplay 的 `k.opacity()` 组件。
