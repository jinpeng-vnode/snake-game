/**
 * js/constants.js — 游戏常量与枚举定义
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第四节
 *
 * 所有模块共享的常量统一在此定义，各模块通过 import 引用。
 */

// ========== 网格与画布 ==========

/** @type {number} 网格数量（20×20） */
export const GRID_COUNT = 20;

/** @type {number} 每格像素尺寸（30px） */
export const CELL_SIZE = 30;

/** @type {number} 画布像素尺寸（600px = 20 × 30） */
export const CANVAS_SIZE = GRID_COUNT * CELL_SIZE;

// ========== 游戏参数 ==========

/** @type {number} 游戏刷新间隔（毫秒） */
export const TICK_INTERVAL = 180;

/** @type {number} 每个食物的分值 */
export const SCORE_PER_FOOD = 10;

/** @type {string} localStorage 最高分存储键名 */
export const HIGH_SCORE_KEY = 'snakeHighScore';

// ========== 方向枚举 ==========

/**
 * 方向定义，值为坐标增量 {dx, dy}
 * @enum {{dx: number, dy: number}}
 */
export const Direction = {
    UP:    { dx: 0,  dy: -1 },
    DOWN:  { dx: 0,  dy: 1  },
    LEFT:  { dx: -1, dy: 0  },
    RIGHT: { dx: 1,  dy: 0  }
};

// ========== 游戏状态枚举 ==========

/** @enum {string} */
export const GameState = {
    READY:     'ready',
    PLAYING:   'playing',
    PAUSED:    'paused',
    GAME_OVER: 'gameOver',
    WIN:       'win'
};

// ========== 食物类型（TASK-006 预留） ==========

/**
 * 食物类型定义，L2 TASK-006 实现时启用
 * @enum {object}
 */
export const FoodType = {
    NORMAL: { name: '普通', color: '#F44336', shape: 'circle', score: 10, probability: 1.0, timeout: null, effect: null, effectDuration: null }
};
