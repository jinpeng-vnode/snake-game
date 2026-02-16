/**
 * src/main.ts — 入口文件
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第七节 7.11
 *
 * 1. 初始化 Kaplay 引擎（通过 import engine.ts）
 * 2. 注册游戏场景
 * 3. 启动场景
 */

import k from './engine'
import { registerGameScene } from './scenes/game'

registerGameScene()
k.go('game')
