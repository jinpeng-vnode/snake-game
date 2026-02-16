/**
 * src/systems/particle.ts — 粒子特效
 * 对应设计文档: design/L1-TASK-020-PixiJS迁移架构设计.md 第九节 9.9、第十节 10.7
 *
 * 手动管理粒子数组 + PixiJS Graphics 渲染。
 * 每帧由 game.ts 的 ticker 调用 updateParticles()。
 */

import { Container, Graphics } from 'pixi.js'
import { CELL_SIZE } from '../constants'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  life: number
  color: number
}

let particles: Particle[] = []
let layer: Container | null = null

/** 初始化粒子系统（传入渲染容器） */
export function initParticle(container: Container): void {
  layer = container
}

/** 在指定网格位置生成吃食物粒子 */
export function spawnEatParticle(gridX: number, gridY: number, color: string): void {
  const cx = gridX * CELL_SIZE + CELL_SIZE / 2
  const cy = gridY * CELL_SIZE + CELL_SIZE / 2
  const count = 6 + Math.floor(Math.random() * 3)
  const numColor = parseInt(color.replace('#', ''), 16)

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
    const speed = 2 + Math.random() * 2
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1, life: 15,
      color: numColor,
    })
  }
}

/** 生成游戏结束粒子（画布中心） */
export function spawnGameOverParticle(): void {
  spawnEatParticle(10, 10, '#ff6b6b')
}

/** 更新粒子状态（每帧调用） */
export function updateParticles(_deltaMs: number): void {
  if (!layer) return
  // 清除上一帧
  layer.removeChildren()

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    p.life--
    p.alpha = p.life / 15
    if (p.life <= 0) { particles.splice(i, 1); continue }

    const g = new Graphics()
    g.circle(p.x, p.y, 3).fill({ color: p.color, alpha: p.alpha })
    layer.addChild(g)
  }
}
