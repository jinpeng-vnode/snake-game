/**
 * src/systems/score.ts — 分数管理
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第七节 7.7
 * 从 js/score.js 迁移
 */

import { HIGH_SCORE_KEY } from '../constants'

let current = 0
let high = 0

/** 初始化（从 localStorage 读取最高分） */
export function initScore(): void {
  current = 0
  try {
    const saved = localStorage.getItem(HIGH_SCORE_KEY)
    high = saved ? parseInt(saved, 10) : 0
    if (isNaN(high)) high = 0
  } catch (_) {
    high = 0
  }
}

/** 重置当前分数为 0 */
export function resetScore(): void {
  current = 0
}

/** 加分（baseScore × multiplier） */
export function addScore(baseScore: number, multiplier: number): void {
  current += Math.floor(baseScore * multiplier)
  if (current > high) {
    high = current
    try { localStorage.setItem(HIGH_SCORE_KEY, String(high)) } catch (_) { /* 忽略 */ }
  }
}

export function getCurrentScore(): number { return current }
export function getHighScore(): number { return high }

/** 更新 DOM 显示 */
export function updateDisplay(scoreEl: HTMLElement, highScoreEl: HTMLElement): void {
  scoreEl.textContent = '分数: ' + current
  highScoreEl.textContent = '最高分: ' + high
}
