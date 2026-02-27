# PROJECT_BOOTSTRAP.md — 项目启动指南

> AI 角色和新开发者的必读文件。读完即可启动项目开始工作。

---

## 基础信息

| 项目 | 值 |
|------|-----|
| 项目名 | 贪吃蛇游戏 (snake-game) |
| 仓库 | https://github.com/jinpeng-vnode/snake-game |
| 主分支 | main（稳定）、dev（开发） |
| 语言 | TypeScript |
| 渲染引擎 | PixiJS 8 (WebGL) |
| 构建工具 | Vite |
| 包管理器 | npm |
| Node 版本 | >= 20 |

## 目录结构

```
snake-game/
├── src/                 # 源码（PixiJS v3.0）
│   ├── main.ts          # 入口
│   ├── engine.ts        # PixiJS Application 封装
│   ├── constants.ts     # 游戏常量
│   ├── types.ts         # 类型定义
│   ├── scenes/game.ts   # 游戏主场景
│   ├── objects/         # 蛇、食物、墙壁
│   └── systems/         # 输入、计分、音效、特效、粒子
├── js/                  # 旧版 Canvas 代码（已废弃，保留参考）
├── index.html           # 入口 HTML
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
├── design/              # 架构设计文档
├── docs/                # 产品/测试/Bug 文档
└── .github/workflows/   # GitHub Pages 自动部署
```

## 环境依赖

- Node.js >= 20
- npm（项目使用 npm，package-lock.json 已存在）
- 无数据库、无后端、无 Docker
- 纯前端项目，浏览器需支持 WebGL

## 启动方式

```bash
# 1. 安装依赖
npm install

# 2. 开发模式
npm run dev

# 3. 生产构建
npm run build

# 4. 预览构建产物
npm run preview
```

## 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| Vite Dev Server | 5173 | 开发模式，`npm run dev` |
| Vite Preview | 4173 | 预览构建产物，`npm run preview` |

## 验证方式

1. 执行 `npm run dev`，等待终端输出 `Local: http://localhost:5173/`
2. 浏览器打开 http://localhost:5173/
3. 确认：
   - 游戏画布正常渲染（深色背景 + 绿色蛇 + 红色食物 + 灰色墙壁）
   - 方向键/WASD 可控制蛇移动
   - 吃到食物后分数增加
   - ESC/P 可暂停
   - 点击 🔊 按钮可切换静音
4. 构建验证：`npm run build` 无报错，`dist/` 目录生成

## 部署

- 推送到 main 分支后，GitHub Actions 自动构建并部署到 GitHub Pages
- 工作流文件：`.github/workflows/deploy-pages.yml`

## 注意事项

- `js/` 目录是旧版 Canvas 代码，已废弃，不要修改
- 所有新开发在 `src/` 目录进行
- 画布固定 600×600（20×20 网格，每格 30px），通过 CSS 响应式缩放
- 项目无环境变量、无 `.env` 文件
