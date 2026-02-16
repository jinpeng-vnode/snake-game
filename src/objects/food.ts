/**
 * src/objects/food.ts — 食物管理 + Kaplay 渲染
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第七节 7.3
 * UI规格: design/ui/L1-TASK-010-引擎重构视觉规格.md 第四节
 */

import { FoodKind } from '../types'
import type { GridPos, FoodConfig } from '../types'
import { GRID_COUNT, CELL_SIZE, FOOD_CONFIGS } from '../constants'
import k from '../engine'
import type { GameObj } from 'kaplay'

let position: GridPos | null = null
let config: FoodConfig | null = null
let timeRemaining: number | null = null
let foodObj: GameObj | null = null

/** 按概率随机生成食物（避开蛇身） */
export function spawn(isOccupied: (pos: GridPos) => boolean): void {
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
  spawnKind(isOccupied, selected.kind)
}

/** 生成指定类型食物 */
export function spawnKind(isOccupied: (pos: GridPos) => boolean, kind: FoodKind): void {
  destroy()
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

/** 销毁当前食物 Kaplay 对象 */
export function destroy(): void {
  if (foodObj) {
    try { k.destroy(foodObj) } catch (_) { /* 忽略 */ }
    foodObj = null
  }
  position = null
  config = null
  timeRemaining = null
}

/** 设置食物可见性（闪烁用） */
export function setVisible(visible: boolean): void {
  if (foodObj) {
    foodObj.hidden = !visible
  }
}

// ========== 渲染 ==========

function renderFood(): void {
  if (!position || !config) return
  if (foodObj) {
    try { k.destroy(foodObj) } catch (_) { /* 忽略 */ }
  }

  const cx = position.x * CELL_SIZE + CELL_SIZE / 2
  const cy = position.y * CELL_SIZE + CELL_SIZE / 2
  const [r, g, b] = hexToRgb(config.color)

  switch (config.shape) {
    case 'circle':
      foodObj = k.add([
        k.circle(8),
        k.pos(cx, cy),
        k.anchor('center'),
        k.color(r, g, b),
        k.z(3),
      ])
      break

    case 'square':
      foodObj = k.add([
        k.rect(14, 14),
        k.pos(cx, cy),
        k.anchor('center'),
        k.color(r, g, b),
        k.z(3),
      ])
      break

    case 'diamond':
    case 'triangle':
    case 'star':
      // 自定义形状通过 onDraw 绘制
      foodObj = k.add([
        k.pos(cx, cy),
        k.anchor('center'),
        k.z(3),
        {
          draw(this: GameObj) {
            drawCustomShape(config!.shape, config!.color)
          },
        },
      ])
      break
  }
}

/** 自定义形状绘制（在 Kaplay onDraw 上下文中） */
function drawCustomShape(shape: string, color: string): void {
  const [r, g, b] = hexToRgb(color)
  const ctx = (k as unknown as { _k: { gfx: { ggl: { gl: WebGL2RenderingContext } } } })

  // 使用 Kaplay 的 drawLines / drawPolygon 等 API
  switch (shape) {
    case 'diamond':
      k.drawPolygon({
        pts: [
          k.vec2(0, -8),
          k.vec2(8, 0),
          k.vec2(0, 8),
          k.vec2(-8, 0),
        ],
        color: k.rgb(r, g, b),
      })
      break

    case 'triangle':
      k.drawPolygon({
        pts: [
          k.vec2(0, -7),
          k.vec2(-8, 7),
          k.vec2(8, 7),
        ],
        color: k.rgb(r, g, b),
      })
      break

    case 'star': {
      const outerR = 9, innerR = 4, spikes = 5
      const pts = []
      for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 === 0 ? outerR : innerR
        const angle = -Math.PI / 2 + (Math.PI / spikes) * i
        pts.push(k.vec2(Math.cos(angle) * rad, Math.sin(angle) * rad))
      }
      k.drawPolygon({
        pts,
        color: k.rgb(r, g, b),
      })
      break
    }
  }
}

/** 十六进制颜色转 RGB */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}
