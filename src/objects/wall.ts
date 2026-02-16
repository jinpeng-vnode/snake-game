/**
 * src/objects/wall.ts — 墙壁边界渲染
 * 对应设计文档: design/L1-TASK-020-PixiJS迁移架构设计.md 第九节 9.4、第十节 10.5
 *
 * 用 1 个 Graphics 对象绘制 4 条边（4px #3a3a5c 灰紫色）。
 */

import { Container, Graphics } from 'pixi.js'
import { CANVAS_SIZE } from '../constants'

/** 绘制墙壁边界到指定容器 */
export function createWalls(layer: Container): void {
  const g = new Graphics()
  // 上
  g.rect(0, 0, CANVAS_SIZE, 4).fill(0x3a3a5c)
  // 下
  g.rect(0, CANVAS_SIZE - 4, CANVAS_SIZE, 4).fill(0x3a3a5c)
  // 左
  g.rect(0, 0, 4, CANVAS_SIZE).fill(0x3a3a5c)
  // 右
  g.rect(CANVAS_SIZE - 4, 0, 4, CANVAS_SIZE).fill(0x3a3a5c)
  layer.addChild(g)
}
