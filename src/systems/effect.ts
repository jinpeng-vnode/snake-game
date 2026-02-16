/**
 * src/systems/effect.ts — 特效管理
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第七节 7.6
 * 从 js/effect.js 迁移
 */

import { EffectType } from '../types'
import type { ActiveEffect } from '../types'

let activeEffects: ActiveEffect[] = []

/** 添加特效（同类型覆盖） */
export function addEffect(type: EffectType, durationMs: number): void {
  const existing = activeEffects.find(e => e.type === type)
  if (existing) {
    existing.remaining = durationMs
    existing.duration = durationMs
  } else {
    activeEffects.push({ type, remaining: durationMs, duration: durationMs })
  }
}

/** 更新所有特效剩余时间，自动移除过期特效 */
export function updateEffects(deltaMs: number): void {
  for (let i = activeEffects.length - 1; i >= 0; i--) {
    activeEffects[i].remaining -= deltaMs
    if (activeEffects[i].remaining <= 0) {
      activeEffects.splice(i, 1)
    }
  }
}

/** 获取速度倍率 */
export function getSpeedMultiplier(): number {
  if (activeEffects.some(e => e.type === EffectType.SPEED)) return 0.7
  if (activeEffects.some(e => e.type === EffectType.SLOW)) return 1.3
  return 1.0
}

/** 获取得分倍率 */
export function getScoreMultiplier(): number {
  return activeEffects.some(e => e.type === EffectType.DOUBLE) ? 2 : 1
}

/** 获取所有活跃特效列表 */
export function getActiveEffects(): ActiveEffect[] {
  return activeEffects
}

/** 清空所有特效 */
export function clearEffects(): void {
  activeEffects = []
}
