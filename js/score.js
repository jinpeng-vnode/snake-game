/**
 * js/score.js — 分数模块
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.6
 *
 * 管理当前分数、最高分、localStorage 持久化。
 */

import { HIGH_SCORE_KEY } from './constants.js';

const Score = {
    /** @type {number} 当前分数 */
    current: 0,

    /** @type {number} 最高分 */
    high: 0,

    /**
     * 初始化：从 localStorage 读取最高分
     * @returns {void}
     */
    init() {
        this.current = 0;
        try {
            const saved = localStorage.getItem(HIGH_SCORE_KEY);
            this.high = saved ? parseInt(saved, 10) : 0;
            if (isNaN(this.high)) {
                this.high = 0;
            }
        } catch (_e) {
            this.high = 0;
        }
    },

    /**
     * 增加分数（支持倍率），超过最高分则更新并持久化（TASK-006 扩展）
     * @param {number} baseScore - 基础分值
     * @param {number} [multiplier=1] - 得分倍率
     * @returns {void}
     */
    add(baseScore, multiplier = 1) {
        this.current += Math.floor(baseScore * multiplier);
        if (this.current > this.high) {
            this.high = this.current;
            this.save();
        }
    },

    /**
     * 重置当前分数为 0
     * @returns {void}
     */
    reset() {
        this.current = 0;
    },

    /**
     * 将最高分写入 localStorage
     * @returns {void}
     */
    save() {
        try {
            localStorage.setItem(HIGH_SCORE_KEY, String(this.high));
        } catch (_e) {
            // 静默忽略
        }
    },

    /**
     * 更新 HTML 分数面板显示
     * @param {HTMLElement} scoreEl
     * @param {HTMLElement} highScoreEl
     * @returns {void}
     */
    updateDisplay(scoreEl, highScoreEl) {
        scoreEl.textContent = '分数: ' + this.current;
        highScoreEl.textContent = '最高分: ' + this.high;
    }
};

export default Score;
