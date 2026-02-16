/**
 * src/objects/wall.ts — 墙壁边界渲染
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第七节 7.4
 * UI规格: design/ui/L1-TASK-010-引擎重构视觉规格.md 第五节
 */

import k from '../engine'
import { CANVAS_SIZE } from '../constants'

/** 绘制墙壁边界（4px #3a3a5c 灰紫色） */
export function createWalls(): void {
  // 上
  k.add([k.rect(CANVAS_SIZE, 4), k.pos(0, 0), k.color(58, 58, 92), k.z(2)])
  // 下
  k.add([k.rect(CANVAS_SIZE, 4), k.pos(0, CANVAS_SIZE - 4), k.color(58, 58, 92), k.z(2)])
  // 左
  k.add([k.rect(4, CANVAS_SIZE), k.pos(0, 0), k.color(58, 58, 92), k.z(2)])
  // 右
  k.add([k.rect(4, CANVAS_SIZE), k.pos(CANVAS_SIZE - 4, 0), k.color(58, 58, 92), k.z(2)])
}
