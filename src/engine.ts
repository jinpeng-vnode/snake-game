/**
 * src/engine.ts — Kaplay 引擎单例
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第十二节、第十四节
 *
 * global: false 模式，所有模块通过此单例访问 Kaplay API。
 */

import kaplay from 'kaplay'
import { CANVAS_SIZE } from './constants'

// 初始化 Kaplay 引擎，挂载到已有 canvas 元素
const k = kaplay({
  width: CANVAS_SIZE,
  height: CANVAS_SIZE,
  background: [15, 15, 35], // #0f0f23
  canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
  global: false,
  crisp: true,       // 像素清晰
  debug: false,
})

export default k
