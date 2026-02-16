/**
 * vite.config.ts — Vite 构建配置
 * 对应设计文档: design/L1-TASK-009-引擎重构架构设计.md 第三节
 */
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
})
