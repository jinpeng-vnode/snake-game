/**
 * js/renderer.js — 渲染模块
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.7
 *
 * 管理画布绘制：背景、蛇、食物、界面遮罩。
 */

import { CANVAS_SIZE, GRID_COUNT, CELL_SIZE } from './constants.js';

const Renderer = {
    /** @type {CanvasRenderingContext2D|null} */
    ctx: null,

    /** @type {HTMLCanvasElement|null} */
    canvas: null,

    /**
     * 初始化渲染器并设置画布尺寸
     * @param {HTMLCanvasElement} canvas
     * @returns {void}
     */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = CANVAS_SIZE;
        this.canvas.height = CANVAS_SIZE;
    },

    /**
     * 绘制棋盘格背景
     * @returns {void}
     */
    drawBackground() {
        const ctx = this.ctx;
        for (let y = 0; y < GRID_COUNT; y++) {
            for (let x = 0; x < GRID_COUNT; x++) {
                ctx.fillStyle = (x + y) % 2 === 0 ? '#1a1a2e' : '#16213e';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    },

    /**
     * 绘制蛇（渐变色 + 蛇头眼睛 + 蛇尾略小）
     * @param {{x: number, y: number}[]} segments
     * @param {{dx: number, dy: number}} direction
     * @returns {void}
     */
    drawSnake(segments, direction) {
        const ctx = this.ctx;
        const len = segments.length;

        segments.forEach((seg, index) => {
            const x = seg.x * CELL_SIZE + 1;
            const y = seg.y * CELL_SIZE + 1;
            let size = CELL_SIZE - 2;

            // 蛇尾略小
            if (index === len - 1) {
                const shrink = CELL_SIZE * 0.1;
                size = CELL_SIZE - 2 - shrink * 2;
            }

            if (index === 0) {
                // 蛇头：圆角矩形 + 眼睛
                const radius = CELL_SIZE * 0.3;
                ctx.fillStyle = '#4CAF50';
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + size - radius, y);
                ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
                ctx.lineTo(x + size, y + size - radius);
                ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
                ctx.lineTo(x + radius, y + size);
                ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.fill();

                // 眼睛
                const centerX = x + size / 2;
                const centerY = y + size / 2;
                const eyeRadius = CELL_SIZE * 0.08;
                let leftEyeX, leftEyeY, rightEyeX, rightEyeY;

                if (direction.dy === -1) {
                    leftEyeX = centerX - CELL_SIZE * 0.15;
                    leftEyeY = centerY - CELL_SIZE * 0.2;
                    rightEyeX = centerX + CELL_SIZE * 0.15;
                    rightEyeY = centerY - CELL_SIZE * 0.2;
                } else if (direction.dy === 1) {
                    leftEyeX = centerX - CELL_SIZE * 0.15;
                    leftEyeY = centerY + CELL_SIZE * 0.2;
                    rightEyeX = centerX + CELL_SIZE * 0.15;
                    rightEyeY = centerY + CELL_SIZE * 0.2;
                } else if (direction.dx === -1) {
                    leftEyeX = centerX - CELL_SIZE * 0.2;
                    leftEyeY = centerY - CELL_SIZE * 0.15;
                    rightEyeX = centerX - CELL_SIZE * 0.2;
                    rightEyeY = centerY + CELL_SIZE * 0.15;
                } else {
                    leftEyeX = centerX + CELL_SIZE * 0.2;
                    leftEyeY = centerY - CELL_SIZE * 0.15;
                    rightEyeX = centerX + CELL_SIZE * 0.2;
                    rightEyeY = centerY + CELL_SIZE * 0.15;
                }

                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // 蛇身：渐变色
                const progress = index / Math.max(len - 1, 1);
                const r = Math.round(76 + (129 - 76) * progress);
                const g = Math.round(175 + (199 - 175) * progress);
                const b = Math.round(80 + (132 - 80) * progress);
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

                const radius = CELL_SIZE * 0.2;
                let drawX = x;
                let drawY = y;
                if (index === len - 1) {
                    const shrink = CELL_SIZE * 0.1;
                    drawX = x + shrink;
                    drawY = y + shrink;
                }

                ctx.beginPath();
                ctx.moveTo(drawX + radius, drawY);
                ctx.lineTo(drawX + size - radius, drawY);
                ctx.quadraticCurveTo(drawX + size, drawY, drawX + size, drawY + radius);
                ctx.lineTo(drawX + size, drawY + size - radius);
                ctx.quadraticCurveTo(drawX + size, drawY + size, drawX + size - radius, drawY + size);
                ctx.lineTo(drawX + radius, drawY + size);
                ctx.quadraticCurveTo(drawX, drawY + size, drawX, drawY + size - radius);
                ctx.lineTo(drawX, drawY + radius);
                ctx.quadraticCurveTo(drawX, drawY, drawX + radius, drawY);
                ctx.closePath();
                ctx.fill();
            }
        });
    },

    /**
     * 绘制食物（苹果造型）
     * @param {{x: number, y: number}} position
     * @returns {void}
     */
    drawFood(position) {
        const ctx = this.ctx;
        const centerX = position.x * CELL_SIZE + CELL_SIZE / 2;
        const centerY = position.y * CELL_SIZE + CELL_SIZE / 2;

        // 苹果主体
        ctx.fillStyle = '#F44336';
        ctx.beginPath();
        ctx.arc(centerX, centerY, CELL_SIZE * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(centerX - CELL_SIZE * 0.15, centerY - CELL_SIZE * 0.15, CELL_SIZE * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // 茎
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(
            centerX - CELL_SIZE * 0.04,
            centerY - CELL_SIZE * 0.55,
            CELL_SIZE * 0.08,
            CELL_SIZE * 0.15
        );

        // 叶子
        ctx.save();
        ctx.translate(centerX + CELL_SIZE * 0.1, centerY - CELL_SIZE * 0.35);
        ctx.rotate(30 * Math.PI / 180);
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.ellipse(0, 0, CELL_SIZE * 0.2, CELL_SIZE * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    /**
     * 绘制墙壁边界（TASK-005）
     * UI规格: design/ui/L1-TASK-007-游戏界面优化.md 第七节
     * 画布四周内边缘 4px #3a3a5c 灰紫色矩形
     * @returns {void}
     */
    drawWalls() {
        const ctx = this.ctx;
        ctx.fillStyle = '#3a3a5c';
        // 上
        ctx.fillRect(0, 0, CANVAS_SIZE, 4);
        // 下
        ctx.fillRect(0, CANVAS_SIZE - 4, CANVAS_SIZE, 4);
        // 左
        ctx.fillRect(0, 0, 4, CANVAS_SIZE);
        // 右
        ctx.fillRect(CANVAS_SIZE - 4, 0, 4, CANVAS_SIZE);
    },

    /**
     * 绘制开始界面
     * @returns {void}
     */
    drawReadyScreen() {
        const ctx = this.ctx;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        ctx.font = `bold ${Math.floor(CANVAS_SIZE / 8.33)}px Arial, sans-serif`;
        ctx.fillText('贪吃蛇', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 40);

        ctx.font = `${Math.floor(CANVAS_SIZE / 20)}px Arial, sans-serif`;
        ctx.fillText('按空格键开始游戏', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20);
    },

    /**
     * 绘制游戏结束界面
     * @param {number} finalScore
     * @returns {void}
     */
    drawGameOverScreen(finalScore) {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        ctx.font = `bold ${Math.floor(CANVAS_SIZE / 11.11)}px Arial, sans-serif`;
        ctx.fillText('游戏结束', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 60);

        ctx.font = `${Math.floor(CANVAS_SIZE / 16.67)}px Arial, sans-serif`;
        ctx.fillText('最终分数: ' + finalScore, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

        ctx.font = `${Math.floor(CANVAS_SIZE / 22.22)}px Arial, sans-serif`;
        ctx.fillText('按空格键重新开始', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 60);
    },

    /**
     * 绘制通关界面
     * @param {number} finalScore
     * @returns {void}
     */
    drawWinScreen(finalScore) {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        ctx.font = `bold ${Math.floor(CANVAS_SIZE / 11.11)}px Arial, sans-serif`;
        ctx.fillText('恭喜通关', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 60);

        ctx.font = `${Math.floor(CANVAS_SIZE / 16.67)}px Arial, sans-serif`;
        ctx.fillText('最终分数: ' + finalScore, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

        ctx.font = `${Math.floor(CANVAS_SIZE / 22.22)}px Arial, sans-serif`;
        ctx.fillText('按空格键重新开始', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 60);
    },

    /**
     * 绘制暂停遮罩（TASK-004）
     * UI规格: design/ui/L1-TASK-007-游戏界面优化.md 第五节
     * @returns {void}
     */
    drawPausedScreen() {
        const ctx = this.ctx;

        // 半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        // "已暂停" 36px
        ctx.font = 'bold 36px Arial, sans-serif';
        ctx.fillText('已暂停', CANVAS_SIZE / 2, CANVAS_SIZE * 0.4);

        // 提示文字 18px，移动端显示不同文案
        ctx.font = '18px Arial, sans-serif';
        const hint = window.innerWidth < 768 ? '点击屏幕继续' : '按 ESC 或 P 键继续';
        ctx.fillText(hint, CANVAS_SIZE / 2, CANVAS_SIZE * 0.4 + 50);
    }
};

export default Renderer;
