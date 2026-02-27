# 🐍 贪吃蛇游戏

> ✅ **当前状态：v3.0 PixiJS 版已完成，已部署上线**

## 🗺️ 功能全景

```
贪吃蛇游戏 v3.0
├── 🎮 核心玩法
│   ├── ✅ 蛇身移动与增长 (TASK-001, 已完成)
│   ├── ✅ 食物生成与碰撞检测 (TASK-001, 已完成)
│   ├── ✅ 墙壁边界碰撞 (TASK-005, 已完成)
│   └── ✅ 多种食物类型：普通/加速/减速/双倍/缩短 (TASK-006, 已完成)
├── 🖥️ 渲染引擎
│   ├── ✅ PixiJS 8 WebGL 渲染 (TASK-020~021, 已完成)
│   ├── ✅ 粒子特效系统 (TASK-025, 已完成)
│   └── ✅ 响应式画布布局 (TASK-016, 已完成)
├── 🎯 输入系统
│   ├── ✅ 键盘控制：方向键 + WASD (TASK-004, 已完成)
│   ├── ✅ 暂停功能：ESC / P (TASK-004, 已完成)
│   ├── ✅ 手机触屏滑动 (TASK-002, 已完成)
│   └── ✅ 虚拟方向键（< 768px 自动显示）(TASK-002, 已完成)
├── 🔊 音效系统
│   ├── ✅ Web Audio API 音效 (TASK-003, 已完成)
│   └── ✅ 静音切换 + 本地持久化 (TASK-003, 已完成)
├── 📊 计分系统
│   ├── ✅ 实时分数显示 (TASK-001, 已完成)
│   └── ✅ 最高分 localStorage 持久化 (TASK-001, 已完成)
├── 🎨 视觉效果
│   ├── ✅ 食物形状区分：圆/菱形/三角/星/方 (TASK-006, 已完成)
│   ├── ✅ 特效状态提示（加速/减速/双倍）(TASK-006, 已完成)
│   └── ✅ 粒子爆炸动画 (TASK-025, 已完成)
└── 🚀 部署
    ├── ✅ Vite 构建 (TASK-021, 已完成)
    └── ✅ GitHub Pages 自动部署 (TASK-027, 已完成)
```

**完成度：约 100%**，所有核心功能已开发完成并通过测试，已部署上线。

---

## 技术栈

- 渲染引擎：PixiJS 8 (WebGL)
- 语言：TypeScript
- 构建工具：Vite
- 部署：GitHub Pages + GitHub Actions

## 快速开始

```bash
npm install
npm run dev      # 开发模式，默认 http://localhost:5173
npm run build    # 生产构建，输出到 dist/
```

## 项目结构

```
src/
├── main.ts              # 入口，初始化 PixiJS
├── engine.ts            # PixiJS Application 封装
├── constants.ts         # 游戏常量（网格、速度、食物配置）
├── types.ts             # TypeScript 类型定义
├── scenes/
│   └── game.ts          # 游戏主场景（状态机、游戏循环）
├── objects/
│   ├── snake.ts         # 蛇对象
│   ├── food.ts          # 食物对象
│   └── wall.ts          # 墙壁对象
└── systems/
    ├── input.ts         # 输入系统（键盘、触屏、虚拟方向键）
    ├── score.ts         # 计分系统
    ├── sound.ts         # 音效系统
    ├── effect.ts        # 特效状态管理
    └── particle.ts      # 粒子系统
```

## 操作说明

| 操作 | 按键 |
|------|------|
| 移动 | 方向键 / WASD |
| 暂停 | ESC / P |
| 静音 | 点击 🔊 按钮 |
| 手机 | 滑动 / 虚拟方向键 |
