/**
 * js/particle.js — 粒子特效模块
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.8
 *
 * 管理粒子的生成、更新、渲染。
 */

import { CELL_SIZE } from './constants.js';

const ParticleSystem = {
    /** @type {Array<{x: number, y: number, vx: number, vy: number, alpha: number, life: number}>} */
    particles: [],

    /**
     * 在指定网格位置生成粒子
     * @param {number} gridX
     * @param {number} gridY
     * @returns {void}
     */
    spawn(gridX, gridY) {
        const centerX = gridX * CELL_SIZE + CELL_SIZE / 2;
        const centerY = gridY * CELL_SIZE + CELL_SIZE / 2;
        const count = 6 + Math.floor(Math.random() * 3);

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 2 + Math.random() * 2;
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                life: 15
            });
        }
    },

    /**
     * 更新所有粒子状态
     * @returns {void}
     */
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.alpha = p.life / 15;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    },

    /**
     * 渲染所有粒子
     * @param {CanvasRenderingContext2D} ctx
     * @returns {void}
     */
    render(ctx) {
        this.particles.forEach(p => {
            ctx.fillStyle = `rgba(255, 107, 107, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    /**
     * 清空所有粒子
     * @returns {void}
     */
    clear() {
        this.particles = [];
    }
};

export default ParticleSystem;
