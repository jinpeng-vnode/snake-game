/**
 * src/systems/input.ts — 输入系统（键盘/触屏/虚拟方向键）
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第七节 7.5
 * UI规格: design/ui/L1-TASK-010-引擎重构视觉规格.md 第九节
 * 从 js/input.js 迁移
 */

import { Direction } from '../types'
import { SWIPE_THRESHOLD, MOBILE_BREAKPOINT } from '../constants'
import k from '../engine'

interface InputCallbacks {
  onDirection: (dir: Direction) => void
  onAction: () => void
  onTogglePause: () => void
}

let callbacks: InputCallbacks | null = null

/** 键盘按键到方向的映射 */
const KEY_DIR_MAP: Record<string, Direction> = {
  up: Direction.UP,
  down: Direction.DOWN,
  left: Direction.LEFT,
  right: Direction.RIGHT,
  w: Direction.UP,
  s: Direction.DOWN,
  a: Direction.LEFT,
  d: Direction.RIGHT,
}

/** 初始化输入系统 */
export function initInput(cbs: InputCallbacks): void {
  callbacks = cbs

  // Kaplay 键盘事件
  for (const [key, dir] of Object.entries(KEY_DIR_MAP)) {
    k.onKeyPress(key as never, () => {
      callbacks?.onDirection(dir)
    })
  }

  k.onKeyPress('space' as never, () => {
    callbacks?.onAction()
  })

  k.onKeyPress('escape' as never, () => {
    callbacks?.onTogglePause()
  })

  k.onKeyPress('p' as never, () => {
    callbacks?.onTogglePause()
  })

  // 触屏滑动
  initTouchSwipe()
  // 虚拟方向键
  initVirtualDpad()
}

/** 清理事件监听 */
export function destroyInput(): void {
  callbacks = null
}

// ========== 触屏 ==========

function initTouchSwipe(): void {
  const canvas = document.getElementById('gameCanvas')
  if (!canvas) return

  let startX = 0
  let startY = 0

  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    const touch = e.touches[0]
    startX = touch.clientX
    startY = touch.clientY
  }, { passive: true })

  canvas.addEventListener('touchend', (e: TouchEvent) => {
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
  })
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
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const dir = DIR_MAP[(btn as HTMLElement).dataset.dir ?? '']
      if (dir) callbacks?.onDirection(dir)
    })
  })
}
