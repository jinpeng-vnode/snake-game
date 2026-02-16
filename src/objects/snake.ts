/**
 * src/objects/snake.ts — 蛇数据管理 + Kaplay 渲染
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第七节 7.2
 * UI规格: design/ui/L1-TASK-010-引擎重构视觉规格.md 第三节
 */

import { Direction, DIR_VECTORS, OPPOSITE } from '../types'
import type { GridPos } from '../types'
import { CELL_SIZE, GRID_COUNT } from '../constants'
import k from '../engine'
import type { GameObj } from 'kaplay'

// ========== 数据层 ==========
let segments: GridPos[] = []
let direction: Direction = Direction.RIGHT

// ========== 渲染层 ==========
let snakeObjects: GameObj[] = []

/** 初始化蛇（3 格，方向向右） */
export function createSnake(): void {
  destroy()
  segments = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]
  direction = Direction.RIGHT
  syncRender()
}

/** 设置方向（忽略反方向） */
export function setDirection(dir: Direction): void {
  if (OPPOSITE[dir] !== direction) {
    direction = dir
  }
}

export function getDirection(): Direction {
  return direction
}

export function getHead(): GridPos {
  return segments[0]
}

export function getSegments(): GridPos[] {
  return segments
}

/** 移动蛇（grow=true 时蛇身+1） */
export function move(grow: boolean): void {
  const head = segments[0]
  const vec = DIR_VECTORS[direction]
  segments.unshift({ x: head.x + vec.x, y: head.y + vec.y })
  if (!grow) {
    segments.pop()
  }
  syncRender()
}

/** 缩短蛇身（最少保留 1 格） */
export function shrink(n: number): void {
  const removeCount = Math.min(n, segments.length - 1)
  if (removeCount > 0) {
    segments.splice(-removeCount, removeCount)
    syncRender()
  }
}

/** 检测自身碰撞 */
export function checkSelfCollision(): boolean {
  const head = segments[0]
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].x === head.x && segments[i].y === head.y) return true
  }
  return false
}

/** 检测指定坐标是否被蛇占据 */
export function occupies(pos: GridPos): boolean {
  return segments.some(s => s.x === pos.x && s.y === pos.y)
}

export function getLength(): number {
  return segments.length
}

/** 销毁所有 Kaplay 渲染对象 */
export function destroy(): void {
  snakeObjects.forEach(obj => { try { k.destroy(obj) } catch (_) { /* 忽略 */ } })
  snakeObjects = []
  segments = []
}

// ========== 渲染同步 ==========

/** 根据 segments 数据重建 Kaplay 渲染对象 */
function syncRender(): void {
  // 清除旧对象
  snakeObjects.forEach(obj => { try { k.destroy(obj) } catch (_) { /* 忽略 */ } })
  snakeObjects = []

  const len = segments.length

  segments.forEach((seg, index) => {
    const px = seg.x * CELL_SIZE + 1
    const py = seg.y * CELL_SIZE + 1
    let size = CELL_SIZE - 2

    if (index === 0) {
      // 蛇头: #388E3C，圆角 9px
      const obj = k.add([
        k.rect(size, size, { radius: CELL_SIZE * 0.3 }),
        k.pos(px, py),
        k.color(56, 142, 60),
        k.z(4),
      ])
      snakeObjects.push(obj)

      // 眼睛
      const cx = px + size / 2
      const cy = py + size / 2
      const eyeR = CELL_SIZE * 0.08
      const vec = DIR_VECTORS[direction]
      let lx: number, ly: number, rx: number, ry: number

      if (vec.y === -1) {
        // UP
        lx = cx - CELL_SIZE * 0.15; ly = cy - CELL_SIZE * 0.2
        rx = cx + CELL_SIZE * 0.15; ry = cy - CELL_SIZE * 0.2
      } else if (vec.y === 1) {
        // DOWN
        lx = cx - CELL_SIZE * 0.15; ly = cy + CELL_SIZE * 0.2
        rx = cx + CELL_SIZE * 0.15; ry = cy + CELL_SIZE * 0.2
      } else if (vec.x === -1) {
        // LEFT
        lx = cx - CELL_SIZE * 0.2; ly = cy - CELL_SIZE * 0.15
        rx = cx - CELL_SIZE * 0.2; ry = cy + CELL_SIZE * 0.15
      } else {
        // RIGHT
        lx = cx + CELL_SIZE * 0.2; ly = cy - CELL_SIZE * 0.15
        rx = cx + CELL_SIZE * 0.2; ry = cy + CELL_SIZE * 0.15
      }

      const leftEye = k.add([
        k.circle(eyeR),
        k.pos(lx, ly),
        k.anchor('center'),
        k.color(0, 0, 0),
        k.z(5),
      ])
      const rightEye = k.add([
        k.circle(eyeR),
        k.pos(rx, ry),
        k.anchor('center'),
        k.color(0, 0, 0),
        k.z(5),
      ])
      snakeObjects.push(leftEye, rightEye)
    } else {
      // 蛇身渐变: #4CAF50 → #81C784
      const progress = index / Math.max(len - 1, 1)
      const r = Math.round(76 + (129 - 76) * progress)
      const g = Math.round(175 + (199 - 175) * progress)
      const b = Math.round(80 + (132 - 80) * progress)

      let drawX = px
      let drawY = py
      // 蛇尾缩小
      if (index === len - 1) {
        const shrinkPx = CELL_SIZE * 0.1
        size = CELL_SIZE - 2 - shrinkPx * 2
        drawX = px + shrinkPx
        drawY = py + shrinkPx
      }

      const obj = k.add([
        k.rect(size, size, { radius: CELL_SIZE * 0.2 }),
        k.pos(drawX, drawY),
        k.color(r, g, b),
        k.z(4),
      ])
      snakeObjects.push(obj)
    }
  })
}

/** 检测蛇头是否超出网格边界 */
export function checkWallCollision(): boolean {
  const head = segments[0]
  return head.x < 0 || head.x >= GRID_COUNT || head.y < 0 || head.y >= GRID_COUNT
}
