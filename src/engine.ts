/**
 * src/engine.ts — PixiJS Application 单例
 * 对应设计文档: design/L1-TASK-020-PixiJS迁移架构设计.md 第六节、第九节 9.1
 *
 * PixiJS v8 必须异步初始化，导出初始化函数和获取实例函数。
 */

import { Application } from 'pixi.js'

let app: Application

/** 初始化 PixiJS Application（必须在使用前调用） */
export async function initEngine(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): Promise<Application> {
  app = new Application()
  await app.init({
    canvas,
    width,
    height,
    background: '#0f0f23',
    antialias: false,
    resolution: 1,
    autoDensity: false,
  })
  // 启用 zIndex 排序
  app.stage.sortableChildren = true
  return app
}

/** 获取已初始化的 Application 实例 */
export function getApp(): Application {
  return app
}
