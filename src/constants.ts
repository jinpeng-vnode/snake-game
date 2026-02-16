/**
 * src/constants.ts — 游戏常量
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第七节 7.1
 * 从 js/constants.js 迁移，加 TypeScript 类型
 */

import { FoodKind, EffectType } from './types'
import type { FoodConfig } from './types'

// ========== 网格与画布 ==========
export const GRID_COUNT = 20
export const CELL_SIZE = 30
export const CANVAS_SIZE = GRID_COUNT * CELL_SIZE // 600

// ========== 游戏参数 ==========
export const TICK_INTERVAL = 180
export const SCORE_PER_FOOD = 10
export const HIGH_SCORE_KEY = 'snakeHighScore'
export const MUTE_KEY = 'snakeMuted'

// ========== 触屏参数 ==========
export const SWIPE_THRESHOLD = 30
export const MOBILE_BREAKPOINT = 768

// ========== 食物配置 ==========
export const FOOD_CONFIGS: FoodConfig[] = [
  { kind: FoodKind.NORMAL, name: '普通', color: '#F44336', shape: 'circle',   score: 10, probability: 1.0,  timeout: null, effect: null,            effectDuration: null },
  { kind: FoodKind.SPEED,  name: '加速', color: '#FF9800', shape: 'diamond',  score: 15, probability: 0.15, timeout: 8000, effect: EffectType.SPEED, effectDuration: 5000 },
  { kind: FoodKind.SLOW,   name: '减速', color: '#2196F3', shape: 'triangle', score: 15, probability: 0.15, timeout: 8000, effect: EffectType.SLOW,  effectDuration: 5000 },
  { kind: FoodKind.DOUBLE, name: '双倍', color: '#FFD700', shape: 'star',     score: 20, probability: 0.10, timeout: 8000, effect: EffectType.DOUBLE, effectDuration: 8000 },
  { kind: FoodKind.SHRINK, name: '缩短', color: '#9C27B0', shape: 'square',   score: 5,  probability: 0.10, timeout: 6000, effect: null,            effectDuration: null },
]
