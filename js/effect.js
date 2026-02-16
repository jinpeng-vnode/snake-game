/**
 * js/effect.js — 特殊效果管理器
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.4
 *
 * 管理加速/减速/双倍得分等限时效果。
 * 同类效果叠加时刷新持续时间，不同类效果可共存。
 */

const EffectManager = {
    /** @type {Array<{type: string, remaining: number}>} 当前生效的效果列表 */
    activeEffects: [],

    /**
     * 添加效果。同类型刷新持续时间，不同类型共存
     * @param {string} type - 'speed' | 'slow' | 'double'
     * @param {number} duration - 持续时间（毫秒）
     * @returns {void}
     */
    add(type, duration) {
        const existing = this.activeEffects.find(e => e.type === type);
        if (existing) {
            existing.remaining = duration;
        } else {
            this.activeEffects.push({ type, remaining: duration });
        }
    },

    /**
     * 更新剩余时间，移除过期效果
     * @param {number} deltaMs - 经过的毫秒数
     * @returns {void}
     */
    update(deltaMs) {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            this.activeEffects[i].remaining -= deltaMs;
            if (this.activeEffects[i].remaining <= 0) {
                this.activeEffects.splice(i, 1);
            }
        }
    },

    /**
     * 检查指定效果是否生效中
     * @param {string} type
     * @returns {boolean}
     */
    isActive(type) {
        return this.activeEffects.some(e => e.type === type);
    },

    /**
     * 获取 tick 间隔倍率（加速 0.7 / 减速 1.3 / 正常 1.0）
     * @returns {number}
     */
    getSpeedMultiplier() {
        if (this.isActive('speed')) return 0.7;
        if (this.isActive('slow')) return 1.3;
        return 1.0;
    },

    /**
     * 获取得分倍率（双倍 2 / 正常 1）
     * @returns {number}
     */
    getScoreMultiplier() {
        return this.isActive('double') ? 2 : 1;
    },

    /**
     * 获取生效效果列表（UI 显示用）
     * @returns {Array<{type: string, remaining: number}>}
     */
    getActiveEffects() {
        return this.activeEffects;
    },

    /**
     * 清空所有效果
     * @returns {void}
     */
    clear() {
        this.activeEffects = [];
    }
};

export default EffectManager;
