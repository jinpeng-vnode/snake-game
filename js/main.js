/**
 * js/main.js — 入口文件
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.10
 *
 * 导入 Game 主控制器并在 DOM 加载后初始化。
 */

import Game from './game.js';

window.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
