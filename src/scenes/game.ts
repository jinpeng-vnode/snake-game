/**
 * src/scenes/game.ts — 游戏主场景
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第七节 7.10
 * UI规格: design/ui/L1-TASK-010-引擎重构视觉规格.md
 *
 * 整合状态机 + 游戏循环 + 所有模块协调
 */

import k from '../engine'
import { CANVAS_SIZE, CELL_SIZE, GRID_COUNT, TICK_INTERVAL, FOOD_CONFIGS, MOBILE_BREAKPOINT } from '../constants'
import { GameState, FoodKind, Direction } from '../types'
import type { GameObj } from 'kaplay'

// objects
import * as Snake from '../objects/snake'
import * as Food from '../objects/food'
import { createWalls } from '../objects/wall'

// systems
import { addEffect, updateEffects, getSpeedMultiplier, getScoreMultiplier, getActiveEffects, clearEffects } from '../systems/effect'
import { initScore, resetScore, addScore, getCurrentScore, getHighScore, updateDisplay } from '../systems/score'
import { initInput, destroyInput } from '../systems/input'
import { initSound, ensureContext, playEat, playGameOver, startBgm, stopBgm, toggleMute, isMuted } from '../systems/sound'
import { spawnEatParticle, spawnGameOverParticle } from '../systems/particle'

/** 注册游戏场景 */
export function registerGameScene(): void {
  k.scene('game', () => {
    // ========== 状态 ==========
    let state: GameState = GameState.READY
    let tickTimer = 0
    let currentTickInterval = TICK_INTERVAL
    let lastTickTime = 0

    // DOM 元素
    const scoreEl = document.getElementById('score')!
    const highScoreEl = document.getElementById('highScore')!
    const muteBtn = document.getElementById('muteBtn')

    // ========== 初始化 ==========
    initScore()
    updateDisplay(scoreEl, highScoreEl)
    initSound()

    // 静音按钮
    if (muteBtn) {
      muteBtn.textContent = isMuted() ? '🔇' : '🔊'
      muteBtn.addEventListener('click', () => {
        ensureContext()
        toggleMute()
      })
    }

    // 绘制棋盘格背景
    drawCheckerboard()
    // 绘制墙壁
    createWalls()

    // 遮罩层和文字对象
    let overlayObj: GameObj | null = null
    let textObjects: GameObj[] = []

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
          startGame()
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
    k.onUpdate(() => {
      if (state !== GameState.PLAYING) return

      const now = Date.now()
      const deltaMs = now - lastTickTime

      // 食物闪烁
      if (Food.getPosition() && Food.getConfig()) {
        Food.setVisible(!Food.isBlinking())
      }

      // 按 tick 间隔执行游戏逻辑
      tickTimer += k.dt() * 1000
      if (tickTimer < currentTickInterval) return
      tickTimer = 0
      lastTickTime = now

      // 更新特效
      updateEffects(currentTickInterval)

      // 更新食物限时
      const expired = Food.updateTimer(currentTickInterval)
      if (expired) {
        Food.spawnKind(pos => Snake.occupies(pos), FoodKind.NORMAL)
      }

      // 动态调整 tick 间隔
      const newInterval = Math.round(TICK_INTERVAL * getSpeedMultiplier())
      currentTickInterval = newInterval

      // 移动蛇
      const foodPos = Food.getPosition()
      const head = Snake.getHead()
      const vec = { x: head.x + dirVecX(Snake.getDirection()), y: head.y + dirVecY(Snake.getDirection()) }

      // 检测墙壁碰撞（预判）
      if (vec.x < 0 || vec.x >= GRID_COUNT || vec.y < 0 || vec.y >= GRID_COUNT) {
        gameOver()
        return
      }

      const ateFood = foodPos !== null && vec.x === foodPos.x && vec.y === foodPos.y
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

        Food.spawn(pos => Snake.occupies(pos))
      }

      // 更新特效指示器
      updateEffectIndicators()
    })

    // ========== 特效指示器 ==========
    let indicatorObjects: GameObj[] = []

    function updateEffectIndicators(): void {
      // 清除旧指示器
      indicatorObjects.forEach(obj => { try { k.destroy(obj) } catch (_) { /* 忽略 */ } })
      indicatorObjects = []

      const effects = getActiveEffects()
      if (effects.length === 0) return

      const effectConfig: Record<string, { prefix: string; color: [number, number, number] }> = {
        speed:  { prefix: '⚡ 加速', color: [255, 152, 0] },
        slow:   { prefix: '🐢 减速', color: [33, 150, 243] },
        double: { prefix: '✨ 双倍', color: [255, 215, 0] },
      }

      // 使用 onDraw 绘制指示器（Canvas 2D 风格）
      const indicatorObj = k.add([
        k.pos(0, 0),
        k.z(6),
        {
          draw() {
            const currentEffects = getActiveEffects()
            if (currentEffects.length === 0) return

            const y = 12
            const paddingH = 6
            const paddingV = 2
            const gap = 8
            const fontSize = 12

            // 计算标签
            const labels: { text: string; width: number; color: [number, number, number] }[] = []
            for (const e of currentEffects) {
              const cfg = effectConfig[e.type]
              if (!cfg) continue
              const seconds = Math.ceil(e.remaining / 1000)
              const text = cfg.prefix + ' ' + seconds + 's'
              // 估算宽度（每字符约 8px）
              const width = text.length * 8 + paddingH * 2
              labels.push({ text, width, color: cfg.color })
            }
            if (labels.length === 0) return

            const totalWidth = labels.reduce((s, l) => s + l.width, 0) + gap * (labels.length - 1)
            let x = (CANVAS_SIZE - totalWidth) / 2

            for (const label of labels) {
              const h = fontSize + paddingV * 2
              // 背景
              k.drawRect({
                pos: k.vec2(x, y),
                width: label.width,
                height: h,
                radius: 4,
                color: k.rgb(0, 0, 0),
                opacity: 0.5,
              })
              // 文字
              k.drawText({
                text: label.text,
                pos: k.vec2(x + paddingH, y + paddingV),
                size: fontSize,
                color: k.rgb(label.color[0], label.color[1], label.color[2]),
              })
              x += label.width + gap
            }
          },
        },
      ])
      indicatorObjects.push(indicatorObj)
    }

    // ========== 状态管理 ==========

    function startGame(): void {
      clearOverlay()
      state = GameState.PLAYING
      ensureContext()
      startBgm()

      Snake.createSnake()
      resetScore()
      updateDisplay(scoreEl, highScoreEl)
      clearEffects()
      currentTickInterval = TICK_INTERVAL
      tickTimer = 0
      lastTickTime = Date.now()

      Food.spawnKind(pos => Snake.occupies(pos), FoodKind.NORMAL)
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
      indicatorObjects.forEach(obj => { try { k.destroy(obj) } catch (_) { /* 忽略 */ } })
      indicatorObjects = []
      spawnGameOverParticle()
      drawGameOverScreen()
    }

    function winGame(): void {
      state = GameState.WIN
      stopBgm()
      clearEffects()
      indicatorObjects.forEach(obj => { try { k.destroy(obj) } catch (_) { /* 忽略 */ } })
      indicatorObjects = []
      drawWinScreen()
    }

    // ========== 遮罩层与界面文字 ==========

    function clearOverlay(): void {
      if (overlayObj) { try { k.destroy(overlayObj) } catch (_) { /* 忽略 */ } overlayObj = null }
      textObjects.forEach(obj => { try { k.destroy(obj) } catch (_) { /* 忽略 */ } })
      textObjects = []
    }

    function drawOverlay(): void {
      overlayObj = k.add([
        k.rect(CANVAS_SIZE, CANVAS_SIZE),
        k.pos(0, 0),
        k.color(0, 0, 0),
        k.opacity(0.5),
        k.z(7),
      ])
    }

    function drawReadyScreen(): void {
      // 开始界面无遮罩
      const title = k.add([
        k.text('贪吃蛇', { size: Math.floor(CANVAS_SIZE / 8.33) }),
        k.pos(CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 40),
        k.anchor('center'),
        k.color(255, 255, 255),
        k.z(7),
      ])
      const hint = k.add([
        k.text('按空格键开始游戏', { size: Math.floor(CANVAS_SIZE / 20) }),
        k.pos(CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20),
        k.anchor('center'),
        k.color(255, 255, 255),
        k.z(7),
      ])
      textObjects.push(title, hint)
    }

    function drawPausedScreen(): void {
      drawOverlay()
      const title = k.add([
        k.text('已暂停', { size: 36 }),
        k.pos(CANVAS_SIZE / 2, CANVAS_SIZE * 0.4),
        k.anchor('center'),
        k.color(255, 255, 255),
        k.z(8),
      ])
      const hint = window.innerWidth < MOBILE_BREAKPOINT ? '点击屏幕继续' : '按 ESC 或 P 键继续'
      const hintObj = k.add([
        k.text(hint, { size: 18 }),
        k.pos(CANVAS_SIZE / 2, CANVAS_SIZE * 0.4 + 50),
        k.anchor('center'),
        k.color(255, 255, 255),
        k.z(8),
      ])
      textObjects.push(title, hintObj)
    }

    function drawGameOverScreen(): void {
      drawOverlay()
      const title = k.add([
        k.text('游戏结束', { size: Math.floor(CANVAS_SIZE / 11.11) }),
        k.pos(CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 60),
        k.anchor('center'),
        k.color(255, 255, 255),
        k.z(8),
      ])
      const scoreText = k.add([
        k.text('最终分数: ' + getCurrentScore(), { size: Math.floor(CANVAS_SIZE / 16.67) }),
        k.pos(CANVAS_SIZE / 2, CANVAS_SIZE / 2),
        k.anchor('center'),
        k.color(255, 255, 255),
        k.z(8),
      ])
      const hintObj = k.add([
        k.text('按空格键重新开始', { size: Math.floor(CANVAS_SIZE / 22.22) }),
        k.pos(CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 60),
        k.anchor('center'),
        k.color(255, 255, 255),
        k.z(8),
      ])
      textObjects.push(title, scoreText, hintObj)
    }

    function drawWinScreen(): void {
      drawOverlay()
      const title = k.add([
        k.text('恭喜通关', { size: Math.floor(CANVAS_SIZE / 11.11) }),
        k.pos(CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 60),
        k.anchor('center'),
        k.color(255, 255, 255),
        k.z(8),
      ])
      const scoreText = k.add([
        k.text('最终分数: ' + getCurrentScore(), { size: Math.floor(CANVAS_SIZE / 16.67) }),
        k.pos(CANVAS_SIZE / 2, CANVAS_SIZE / 2),
        k.anchor('center'),
        k.color(255, 255, 255),
        k.z(8),
      ])
      const hintObj = k.add([
        k.text('按空格键重新开始', { size: Math.floor(CANVAS_SIZE / 22.22) }),
        k.pos(CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 60),
        k.anchor('center'),
        k.color(255, 255, 255),
        k.z(8),
      ])
      textObjects.push(title, scoreText, hintObj)
    }

    // ========== 棋盘格背景 ==========

    function drawCheckerboard(): void {
      for (let y = 0; y < GRID_COUNT; y++) {
        for (let x = 0; x < GRID_COUNT; x++) {
          const isLight = (x + y) % 2 === 0
          k.add([
            k.rect(CELL_SIZE, CELL_SIZE),
            k.pos(x * CELL_SIZE, y * CELL_SIZE),
            k.color(isLight ? 26 : 22, isLight ? 26 : 33, isLight ? 46 : 62),
            k.z(1),
          ])
        }
      }
    }

    // ========== 辅助函数 ==========

    function dirVecX(dir: Direction): number {
      switch (dir) {
        case Direction.LEFT: return -1
        case Direction.RIGHT: return 1
        default: return 0
      }
    }

    function dirVecY(dir: Direction): number {
      switch (dir) {
        case Direction.UP: return -1
        case Direction.DOWN: return 1
        default: return 0
      }
    }
  })
}
