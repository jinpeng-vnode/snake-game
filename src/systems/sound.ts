/**
 * src/systems/sound.ts — 音效管理（Web Audio API 合成）
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第七节 7.8
 * 从 js/sound.js 迁移，保留 Web Audio API 实现
 */

import { MUTE_KEY } from '../constants'

let ctx: AudioContext | null = null
let muted = false
let bgmOscillator: OscillatorNode | null = null
let bgmGain: GainNode | null = null

/** 初始化（读取 localStorage 静音状态） */
export function initSound(): void {
  try {
    muted = localStorage.getItem(MUTE_KEY) === 'true'
  } catch (_) {
    muted = false
  }
}

/** 确保 AudioContext 已创建 */
export function ensureContext(): void {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch (_) {
      ctx = null
      return
    }
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume()
  }
}

/** 播放吃食物音效 */
export function playEat(): void {
  if (muted || !ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'square'
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.linearRampToValueAtTime(600, now + 0.1)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.linearRampToValueAtTime(0, now + 0.1)
    osc.start(now)
    osc.stop(now + 0.1)
  } catch (_) { /* 静默降级 */ }
}

/** 播放游戏结束音效 */
export function playGameOver(): void {
  if (muted || !ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(400, now)
    osc.frequency.linearRampToValueAtTime(100, now + 0.5)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.linearRampToValueAtTime(0, now + 0.5)
    osc.start(now)
    osc.stop(now + 0.5)
  } catch (_) { /* 静默降级 */ }
}

/** 开始背景音乐 */
export function startBgm(): void {
  if (muted || !ctx || bgmOscillator) return
  try {
    bgmOscillator = ctx.createOscillator()
    bgmGain = ctx.createGain()
    bgmOscillator.connect(bgmGain)
    bgmGain.connect(ctx.destination)
    bgmOscillator.type = 'sine'
    bgmOscillator.frequency.setValueAtTime(80, ctx.currentTime)
    bgmGain.gain.setValueAtTime(0.05, ctx.currentTime)
    bgmOscillator.start()
  } catch (_) {
    bgmOscillator = null
    bgmGain = null
  }
}

/** 停止背景音乐 */
export function stopBgm(): void {
  if (bgmOscillator) {
    try { bgmOscillator.stop() } catch (_) { /* 已停止 */ }
    bgmOscillator = null
    bgmGain = null
  }
}

/** 切换静音 */
export function toggleMute(): void {
  muted = !muted
  try { localStorage.setItem(MUTE_KEY, String(muted)) } catch (_) { /* 忽略 */ }
  const btn = document.getElementById('muteBtn')
  if (btn) btn.textContent = muted ? '🔇' : '🔊'
  if (muted) {
    stopBgm()
  } else {
    ensureContext()
    startBgm()
  }
}

export function isMuted(): boolean { return muted }
