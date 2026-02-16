/**
 * src/scenes/game.ts — 游戏主场景
 * 对应设计文档: design/L1-TASK-020-PixiJS迁移架构设计.md 第七节、第九节 9.10、第十节 10.8
 *
 * 整合状态机 + ticker 游戏循环 + Container 层级管理 + 所有模块协调。
 * 从 Kaplay scene 注册模式改为直接 startGame(app) 启动。
 */

import { Application, Container, Graphics, Text } from 'pixi.js'
import { CANVAS_SIZE, CELL_SIZE, GRID_COUNT, TICK_INTERVAL, FOOD_CONFIGS, MOBILE_BREAKPOINT } from '../constants'
import { GameState, FoodKind, Direction, DIR_VECTORS } from '../types'

// objects
import * as Snake from '../objects/snake'
import * as Food from '../objects/food'
import { createWalls } from '../objects/wall'

// systems
import { addEffect, updateEffects, getSpeedMultiplier, getScoreMultiplier, getActiveEffects, clearEffects } from '../systems/effect'
import { initScore, resetScore, addScore, getCurrentScore, getHighScore, updateDisplay } from '../systems/score'
import { initInput, destroyInput } from '../systems/input'
import { initSound, ensureContext, playEat, playGameOver, startBgm, stopBgm, toggleMute, isMuted } from '../systems/sound'
import { initParticle, spawnEatParticle, spawnGameOverParticle, updateParticles } from '../systems/particle'

/** 启动游戏（初始化所有模块，开始游戏循环） */
export function startGame(app: Application): void {
  // ========== 状态 ==========
  let state: GameState = GameState.READY
  let tickTimer = 0
  let currentTickInterval = TICK_INTERVAL
  let lastTickTime = 0

  // DOM 元素
  const scoreEl = document.getElementById('score')!
  const highScoreEl = document.getElementById('highScore')!
  const muteBtn = document.getElementById('muteBtn')

  // ========== 层级容器 ==========
  const bgLayer = new Container()
  bgLayer.zIndex = 0
  const wallLayer = new Container()
  wallLayer.zIndex = 1
  const foodLayer = new Container()
  foodLayer.zIndex = 2
  const snakeLayer = new Container()
  snakeLayer.zIndex = 3
  const particleLayer = new Container()
  particleLayer.zIndex = 4
  const uiLayer = new Container()
  uiLayer.zIndex = 5
  const overlayLayer = new Container()
  overlayLayer.zIndex = 6

  app.stage.addChild(bgLayer, wallLayer, foodLayer, snakeLayer, particleLayer, uiLayer, overlayLayer)

  // ========== 初始化 ==========
  initScore()
  updateDisplay(scoreEl, highScoreEl)
  initSound()
  initParticle(particleLayer)

  // 静音按钮
  if (muteBtn) {
    muteBtn.textContent = isMuted() ? '🔇' : '🔊'
    muteBtn.addEventListener('click', () => {
      ensureContext()
      toggleMute()
    })
  }

  // 绘制棋盘格背景
  drawCheckerboard(bgLayer)
  // 绘制墙壁
  createWalls(wallLayer)

  // 显示开始界面
  drawReadyScreen()

  // 输入系统
  initInput({
    onDirection: (dir: Direction) => {
      if (state === GameState.PLAYING) {
        Snake.setDirection(dir)
      }
    },
    onAction: () => {
      if (state === GameState.READY || state === GameState.GAME_OVER || state === GameState.WIN) {
        beginGame()
      } else if (state === GameState.PAUSED) {
        resumeGame()
      }
    },
    onTogglePause: () => {
      if (state === GameState.PLAYING) pauseGame()
      else if (state === GameState.PAUSED) resumeGame()
    },
  })

  // 页面失焦自动暂停
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === GameState.PLAYING) {
      pauseGame()
    }
  })

  // ========== 游戏循环 ==========
  app.ticker.add((ticker) => {
    // 粒子每帧更新（不受游戏状态限制）
    updateParticles(ticker.deltaMS)

    if (state !== GameState.PLAYING) return

    const now = Date.now()

    // 食物闪烁
    if (Food.getPosition() && Food.getConfig()) {
      Food.setVisible(!Food.isBlinking())
    }

    // 按 tick 间隔执行游戏逻辑
    tickTimer += ticker.deltaMS
    if (tickTimer < currentTickInterval) return
    tickTimer = 0
    lastTickTime = now

    // 更新特效
    updateEffects(currentTickInterval)

    // 更新食物限时
    const expired = Food.updateTimer(currentTickInterval)
    if (expired) {
      Food.spawnKind(foodLayer, pos => Snake.occupies(pos), FoodKind.NORMAL)
    }

    // 动态调整 tick 间隔
    currentTickInterval = Math.round(TICK_INTERVAL * getSpeedMultiplier())

    // 移动蛇
    const foodPos = Food.getPosition()
    const head = Snake.getHead()
    const vec = DIR_VECTORS[Snake.getDirection()]
    const nextX = head.x + vec.x
    const nextY = head.y + vec.y

    // 检测墙壁碰撞（预判）
    if (nextX < 0 || nextX >= GRID_COUNT || nextY < 0 || nextY >= GRID_COUNT) {
      gameOver()
      return
    }

    const ateFood = foodPos !== null && nextX === foodPos.x && nextY === foodPos.y
    const foodConfig = Food.getConfig()
    const shouldGrow = ateFood && foodConfig?.kind !== FoodKind.SHRINK

    Snake.move(shouldGrow ?? false)

    // 检测自身碰撞
    if (Snake.checkSelfCollision()) {
      gameOver()
      return
    }

    // 吃到食物
    if (ateFood && foodConfig) {
      playEat()
      spawnEatParticle(foodPos!.x, foodPos!.y, foodConfig.color)

      addScore(foodConfig.score, getScoreMultiplier())
      updateDisplay(scoreEl, highScoreEl)

      if (foodConfig.effect && foodConfig.effectDuration) {
        addEffect(foodConfig.effect, foodConfig.effectDuration)
      }

      if (foodConfig.kind === FoodKind.SHRINK) {
        Snake.shrink(2)
      }

      // 通关检测
      if (Snake.getLength() === GRID_COUNT * GRID_COUNT) {
        winGame()
        return
      }

      Food.spawn(foodLayer, pos => Snake.occupies(pos))
    }

    // 更新特效指示器
    updateEffectIndicators()
  })

  // ========== 特效指示器 ==========

  function updateEffectIndicators(): void {
    uiLayer.removeChildren()
    const effects = getActiveEffects()
    if (effects.length === 0) return

    const effectConfig: Record<string, { prefix: string; color: number }> = {
      speed:  { prefix: '⚡ 加速', color: 0xff9800 },
      slow:   { prefix: '🐢 减速', color: 0x2196f3 },
      double: { prefix: '✨ 双倍', color: 0xffd700 },
    }

    const paddingH = 6
    const paddingV = 2
    const gap = 8
    const fontSize = 12
    const y = 12

    // 计算标签
    const labels: { text: string; width: number; color: number }[] = []
    for (const e of effects) {
      const cfg = effectConfig[e.type]
      if (!cfg) continue
      const seconds = Math.ceil(e.remaining / 1000)
      const text = cfg.prefix + ' ' + seconds + 's'
      const width = text.length * 8 + paddingH * 2
      labels.push({ text, width, color: cfg.color })
    }
    if (labels.length === 0) return

    const totalWidth = labels.reduce((s, l) => s + l.width, 0) + gap * (labels.length - 1)
    let x = (CANVAS_SIZE - totalWidth) / 2

    for (const label of labels) {
      const h = fontSize + paddingV * 2
      // 背景
      const bg = new Graphics()
      bg.roundRect(x, y, label.width, h, 4).fill({ color: 0x000000, alpha: 0.5 })
      uiLayer.addChild(bg)
      // 文字
      const t = new Text({
        text: label.text,
        style: { fontSize, fill: label.color, fontFamily: 'Arial' },
      })
      t.position.set(x + paddingH, y + paddingV)
      uiLayer.addChild(t)
      x += label.width + gap
    }
  }

  // ========== 状态管理 ==========

  function beginGame(): void {
    clearOverlay()
    state = GameState.PLAYING
    ensureContext()
    startBgm()

    Snake.createSnake(snakeLayer)
    resetScore()
    updateDisplay(scoreEl, highScoreEl)
    clearEffects()
    uiLayer.removeChildren()
    currentTickInterval = TICK_INTERVAL
    tickTimer = 0
    lastTickTime = Date.now()

    Food.spawnKind(foodLayer, pos => Snake.occupies(pos), FoodKind.NORMAL)
  }

  function pauseGame(): void {
    if (state !== GameState.PLAYING) return
    state = GameState.PAUSED
    drawPausedScreen()
  }

  function resumeGame(): void {
    if (state !== GameState.PAUSED) return
    clearOverlay()
    state = GameState.PLAYING
    lastTickTime = Date.now()
    tickTimer = 0
  }

  function gameOver(): void {
    state = GameState.GAME_OVER
    playGameOver()
    stopBgm()
    clearEffects()
    uiLayer.removeChildren()
    spawnGameOverParticle()
    drawGameOverScreen()
  }

  function winGame(): void {
    state = GameState.WIN
    stopBgm()
    clearEffects()
    uiLayer.removeChildren()
    drawWinScreen()
  }

  // ========== 遮罩层与界面文字 ==========

  function clearOverlay(): void {
    overlayLayer.removeChildren()
  }

  function drawOverlay(): void {
    const bg = new Graphics()
    bg.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE).fill({ color: 0x000000, alpha: 0.5 })
    overlayLayer.addChild(bg)
  }

  function addCenteredText(str: string, fontSize: number, yPos: number): void {
    const t = new Text({
      text: str,
      style: { fontSize, fill: 0xffffff, fontFamily: 'Arial' },
    })
    t.anchor.set(0.5)
    t.position.set(CANVAS_SIZE / 2, yPos)
    overlayLayer.addChild(t)
  }

  function drawReadyScreen(): void {
    addCenteredText('贪吃蛇', Math.floor(CANVAS_SIZE / 8.33), CANVAS_SIZE / 2 - 40)
    addCenteredText('按空格键开始游戏', Math.floor(CANVAS_SIZE / 20), CANVAS_SIZE / 2 + 20)
  }

  function drawPausedScreen(): void {
    drawOverlay()
    addCenteredText('已暂停', 36, CANVAS_SIZE * 0.4)
    const hint = window.innerWidth < MOBILE_BREAKPOINT ? '点击屏幕继续' : '按 ESC 或 P 键继续'
    addCenteredText(hint, 18, CANVAS_SIZE * 0.4 + 50)
  }

  function drawGameOverScreen(): void {
    drawOverlay()
    addCenteredText('游戏结束', Math.floor(CANVAS_SIZE / 11.11), CANVAS_SIZE / 2 - 60)
    addCenteredText('最终分数: ' + getCurrentScore(), Math.floor(CANVAS_SIZE / 16.67), CANVAS_SIZE / 2)
    addCenteredText('按空格键重新开始', Math.floor(CANVAS_SIZE / 22.22), CANVAS_SIZE / 2 + 60)
  }

  function drawWinScreen(): void {
    drawOverlay()
    addCenteredText('恭喜通关', Math.floor(CANVAS_SIZE / 11.11), CANVAS_SIZE / 2 - 60)
    addCenteredText('最终分数: ' + getCurrentScore(), Math.floor(CANVAS_SIZE / 16.67), CANVAS_SIZE / 2)
    addCenteredText('按空格键重新开始', Math.floor(CANVAS_SIZE / 22.22), CANVAS_SIZE / 2 + 60)
  }

  // ========== 棋盘格背景 ==========

  function drawCheckerboard(layer: Container): void {
    const g = new Graphics()
    for (let y = 0; y < GRID_COUNT; y++) {
      for (let x = 0; x < GRID_COUNT; x++) {
        const isLight = (x + y) % 2 === 0
        const color = isLight ? 0x1a1a2e : 0x16213e
        g.rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE).fill(color)
      }
    }
    layer.addChild(g)
  }
}
