/**
 * src/main.ts — 入口文件
 * 对应设计文档: design/L1-TASK-020-PixiJS迁移架构设计.md 第六节、第十节 10.2
 *
 * 异步初始化 PixiJS Application，启动游戏。
 */

import { initEngine } from './engine'
import { CANVAS_SIZE } from './constants'
import { startGame } from './scenes/game'

async function main(): Promise<void> {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
  if (!canvas) {
    console.error('找不到 gameCanvas 元素')
    return
  }
  try {
    const app = await initEngine(canvas, CANVAS_SIZE, CANVAS_SIZE)
    startGame(app)
  } catch (e) {
    console.error('PixiJS 初始化失败:', e)
    // 降级提示
    document.body.innerHTML = '<p style="color:#fff;text-align:center;margin-top:40vh">您的浏览器不支持 WebGL，无法运行游戏。</p>'
  }
}

main()
