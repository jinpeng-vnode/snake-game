/**
 * src/systems/particle.ts — 粒子特效
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第七节 7.9
 * UI规格: design/ui/L1-TASK-010-引擎重构视觉规格.md 第六节
 *
 * 使用手动管理粒子数组 + Kaplay onDraw 渲染，保持与原版一致的视觉效果。
 */

import k from '../engine'
import { CELL_SIZE } from '../constants'
import type { GameObj } from 'kaplay'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  life: number
}

let particles: Particle[] = []
let particleObj: GameObj | null = null

/** 确保粒子渲染对象存在 */
function ensureRenderer(): void {
  if (particleObj) return
  particleObj = k.add([
    k.pos(0, 0),
    k.z(5),
    {
      draw() {
        for (const p of particles) {
          k.drawCircle({
            pos: k.vec2(p.x, p.y),
            radius: 3,
            color: k.rgb(255, 107, 107),
            opacity: p.alpha,
          })
        }
      },
      update() {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]
          p.x += p.vx
          p.y += p.vy
          p.life--
          p.alpha = p.life / 15
          if (p.life <= 0) particles.splice(i, 1)
        }
      },
    },
  ])
}

/** 在指定网格位置生成吃食物粒子 */
export function spawnEatParticle(gridX: number, gridY: number, _color: string): void {
  ensureRenderer()
  const cx = gridX * CELL_SIZE + CELL_SIZE / 2
  const cy = gridY * CELL_SIZE + CELL_SIZE / 2
  const count = 6 + Math.floor(Math.random() * 3)

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
    const speed = 2 + Math.random() * 2
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      life: 15,
    })
  }
}

/** 生成游戏结束粒子（蛇头位置） */
export function spawnGameOverParticle(): void {
  // 复用吃食物粒子逻辑，在画布中心生成
  spawnEatParticle(10, 10, '#ff6b6b')
}
