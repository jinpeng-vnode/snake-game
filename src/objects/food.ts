/**
 * src/objects/food.ts — 食物管理 + PixiJS Graphics 渲染
 * 对应设计文档: design/L1-TASK-020-PixiJS迁移架构设计.md 第九节 9.3、第十节 10.4
 *
 * 数据层（位置、配置、计时器）保留不变，渲染层替换为 PixiJS Graphics。
 */

import { Container, Graphics } from 'pixi.js'
import { FoodKind } from '../types'
import type { GridPos, FoodConfig } from '../types'
import { GRID_COUNT, CELL_SIZE, FOOD_CONFIGS } from '../constants'

let position: GridPos | null = null
let config: FoodConfig | null = null
let timeRemaining: number | null = null
let foodObj: Graphics | null = null
let layer: Container | null = null

/** 按概率随机生成食物（避开蛇身） */
export function spawn(container: Container, isOccupied: (pos: GridPos) => boolean): void {
  const specialConfigs = FOOD_CONFIGS.filter(c => c.kind !== FoodKind.NORMAL)
  const totalSpecial = specialConfigs.reduce((s, c) => s + c.probability, 0)
  const roll = Math.random()

  let selected = FOOD_CONFIGS[0] // 普通
  if (roll < totalSpecial) {
    const innerRoll = Math.random() * totalSpecial
    let cumulative = 0
    for (const c of specialConfigs) {
      cumulative += c.probability
      if (innerRoll < cumulative) {
        selected = c
        break
      }
    }
  }
  spawnKind(container, isOccupied, selected.kind)
}

/** 生成指定类型食物 */
export function spawnKind(container: Container, isOccupied: (pos: GridPos) => boolean, kind: FoodKind): void {
  destroy()
  layer = container
  const cfg = FOOD_CONFIGS.find(c => c.kind === kind) ?? FOOD_CONFIGS[0]

  const emptyCells: GridPos[] = []
  for (let x = 0; x < GRID_COUNT; x++) {
    for (let y = 0; y < GRID_COUNT; y++) {
      if (!isOccupied({ x, y })) emptyCells.push({ x, y })
    }
  }
  if (emptyCells.length === 0) {
    position = null
    config = null
    timeRemaining = null
    return
  }

  position = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  config = cfg
  timeRemaining = cfg.timeout
  renderFood()
}

export function getPosition(): GridPos | null { return position }
export function getConfig(): FoodConfig | null { return config }

/** 更新限时倒计时，返回是否已过期 */
export function updateTimer(deltaMs: number): boolean {
  if (timeRemaining === null) return false
  timeRemaining -= deltaMs
  return timeRemaining <= 0
}

/** 当前食物是否在闪烁（剩余 ≤3 秒） */
export function isBlinking(): boolean {
  if (timeRemaining === null || timeRemaining > 3000) return false
  return Date.now() % 300 >= 150
}

/** 设置食物可见性（闪烁用） */
export function setVisible(visible: boolean): void {
  if (foodObj) {
    foodObj.visible = visible
  }
}

/** 销毁当前食物渲染对象 */
export function destroy(): void {
  if (foodObj) {
    try { foodObj.removeFromParent(); foodObj.destroy() } catch (_) { /* 忽略 */ }
    foodObj = null
  }
  position = null
  config = null
  timeRemaining = null
}

// ========== 渲染 ==========

/** 十六进制颜色字符串转数字 */
function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

function renderFood(): void {
  if (!position || !config || !layer) return
  if (foodObj) {
    try { foodObj.removeFromParent(); foodObj.destroy() } catch (_) { /* 忽略 */ }
  }

  const cx = position.x * CELL_SIZE + CELL_SIZE / 2
  const cy = position.y * CELL_SIZE + CELL_SIZE / 2
  const color = hexToNum(config.color)

  const g = new Graphics()

  switch (config.shape) {
    case 'circle':
      g.circle(cx, cy, 8).fill(color)
      break

    case 'square':
      g.rect(cx - 7, cy - 7, 14, 14).fill(color)
      break

    case 'diamond':
      g.poly([cx, cy - 8, cx + 8, cy, cx, cy + 8, cx - 8, cy]).fill(color)
      break

    case 'triangle':
      g.poly([cx, cy - 7, cx - 8, cy + 7, cx + 8, cy + 7]).fill(color)
      break

    case 'star':
      g.star(cx, cy, 5, 9, 4).fill(color)
      break
  }

  layer.addChild(g)
  foodObj = g
}
