/**
 * src/types.ts — 全局类型定义
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第六节
 */

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
  timeout: number | null
  effect: EffectType | null
  effectDuration: number | null
}

/** 特效类型 */
export enum EffectType {
  SPEED = 'speed',
  SLOW = 'slow',
  DOUBLE = 'double',
}

/** 活跃特效 */
export interface ActiveEffect {
  type: EffectType
  remaining: number
  duration: number
}
