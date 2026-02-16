/**
 * src/systems/input.ts — 输入系统（键盘/触屏/虚拟方向键）
 * 对应设计文档: design/L1-TASK-020-PixiJS迁移架构设计.md 第九节 9.5、第十节 10.6
 *
 * 键盘部分从 Kaplay onKeyPress 改为原生 DOM keydown 事件。
 * 触屏滑动和虚拟方向键代码保留（已是原生 DOM 事件）。
 */

import { Direction } from '../types'
import { SWIPE_THRESHOLD } from '../constants'

interface InputCallbacks {
  onDirection: (dir: Direction) => void
  onAction: () => void
  onTogglePause: () => void
}

let callbacks: InputCallbacks | null = null

// 事件处理函数引用（用于 destroyInput 清理）
let handleTouchStart: ((e: TouchEvent) => void) | null = null
let handleTouchEnd: ((e: TouchEvent) => void) | null = null
let dpadHandlers: { el: Element; fn: (e: Event) => void }[] = []

/** 键盘按键到方向/动作的映射 */
const KEY_MAP: Record<string, Direction> = {
  ArrowUp: Direction.UP, ArrowDown: Direction.DOWN,
  ArrowLeft: Direction.LEFT, ArrowRight: Direction.RIGHT,
  w: Direction.UP, s: Direction.DOWN,
  a: Direction.LEFT, d: Direction.RIGHT,
  W: Direction.UP, S: Direction.DOWN,
  A: Direction.LEFT, D: Direction.RIGHT,
}

function handleKeyDown(e: KeyboardEvent): void {
  if (!callbacks) return
  const dir = KEY_MAP[e.key]
  if (dir) { callbacks.onDirection(dir); return }
  if (e.key === ' ') { callbacks.onAction(); return }
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { callbacks.onTogglePause() }
}

/** 初始化输入系统（注册 DOM 事件） */
export function initInput(cbs: InputCallbacks): void {
  callbacks = cbs
  document.addEventListener('keydown', handleKeyDown)
  initTouchSwipe()
  initVirtualDpad()
}

/** 清理所有事件监听 */
export function destroyInput(): void {
  document.removeEventListener('keydown', handleKeyDown)

  const canvas = document.getElementById('gameCanvas')
  if (canvas) {
    if (handleTouchStart) canvas.removeEventListener('touchstart', handleTouchStart)
    if (handleTouchEnd) canvas.removeEventListener('touchend', handleTouchEnd)
  }
  handleTouchStart = null
  handleTouchEnd = null

  for (const { el, fn } of dpadHandlers) {
    el.removeEventListener('touchstart', fn)
  }
  dpadHandlers = []

  callbacks = null
}

// ========== 触屏 ==========

function initTouchSwipe(): void {
  const canvas = document.getElementById('gameCanvas')
  if (!canvas) return

  let startX = 0
  let startY = 0

  handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    startX = touch.clientX
    startY = touch.clientY
  }

  handleTouchEnd = (e: TouchEvent) => {
    if (!e.changedTouches.length) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - startX
    const dy = touch.clientY - startY

    if (Math.abs(dx) >= SWIPE_THRESHOLD || Math.abs(dy) >= SWIPE_THRESHOLD) {
      if (Math.abs(dx) > Math.abs(dy)) {
        callbacks?.onDirection(dx > 0 ? Direction.RIGHT : Direction.LEFT)
      } else {
        callbacks?.onDirection(dy > 0 ? Direction.DOWN : Direction.UP)
      }
    } else {
      callbacks?.onAction()
    }
  }

  canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
  canvas.addEventListener('touchend', handleTouchEnd)
}

// ========== 虚拟方向键 ==========

const DIR_MAP: Record<string, Direction> = {
  up: Direction.UP,
  down: Direction.DOWN,
  left: Direction.LEFT,
  right: Direction.RIGHT,
}

function initVirtualDpad(): void {
  const btns = document.querySelectorAll('.dpad-btn')
  btns.forEach(btn => {
    const fn = (e: Event) => {
      e.preventDefault()
      const dir = DIR_MAP[(btn as HTMLElement).dataset.dir ?? '']
      if (dir) callbacks?.onDirection(dir)
    }
    btn.addEventListener('touchstart', fn)
    dpadHandlers.push({ el: btn, fn })
  })
}
