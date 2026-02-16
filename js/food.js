/**
 * js/food.js — 食物模块（TASK-006 扩展）
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.5
 * UI规格: design/ui/L1-TASK-007-游戏界面优化.md 第六节、第九节
 *
 * 管理食物的生成、类型、限时倒计时和闪烁。
 */

import { GRID_COUNT, FoodType } from './constants.js';

const Food = {
    /** @type {{x: number, y: number}|null} 当前食物位置 */
    position: null,
    /** @type {object|null} 当前食物类型（FoodType 枚举值） */
    type: null,
    /** @type {number|null} 限时剩余（毫秒），null 表示无限时 */
    timeRemaining: null,

    /**
     * 按概率随机生成食物类型
     * @param {function({x: number, y: number}): boolean} isOccupied
     * @returns {void}
     */
    spawn(isOccupied) {
        // 先决定是否出特殊食物（特殊概率之和 = 0.5），再在特殊类型中按权重选择
        const specialTypes = [FoodType.SPEED, FoodType.SLOW, FoodType.DOUBLE, FoodType.SHRINK];
        const totalSpecial = specialTypes.reduce((s, ft) => s + ft.probability, 0);
        const roll = Math.random();

        let selectedType = FoodType.NORMAL;
        if (roll < totalSpecial) {
            // 在特殊类型中按权重选择
            const innerRoll = Math.random() * totalSpecial;
            let cumulative = 0;
            for (const ft of specialTypes) {
                cumulative += ft.probability;
                if (innerRoll < cumulative) {
                    selectedType = ft;
                    break;
                }
            }
        }

        this.spawnType(isOccupied, selectedType);
    },

    /**
     * 生成指定类型食物
     * @param {function({x: number, y: number}): boolean} isOccupied
     * @param {object} foodType
     * @returns {void}
     */
    spawnType(isOccupied, foodType) {
        const emptyCells = [];
        for (let x = 0; x < GRID_COUNT; x++) {
            for (let y = 0; y < GRID_COUNT; y++) {
                if (!isOccupied({ x, y })) {
                    emptyCells.push({ x, y });
                }
            }
        }
        if (emptyCells.length === 0) {
            this.position = null;
            this.type = null;
            this.timeRemaining = null;
            return;
        }
        this.position = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        this.type = foodType;
        this.timeRemaining = foodType.timeout;
    },

    /**
     * 更新限时倒计时
     * @param {number} deltaMs
     * @returns {boolean} 是否已超时消失
     */
    updateTimer(deltaMs) {
        if (this.timeRemaining === null) return false;
        this.timeRemaining -= deltaMs;
        return this.timeRemaining <= 0;
    },

    /**
     * 判断是否处于闪烁状态（剩余 ≤ 3000ms，300ms 周期）
     * @returns {boolean} true 表示当前帧应隐藏食物
     */
    isBlinking() {
        if (this.timeRemaining === null || this.timeRemaining > 3000) return false;
        return Date.now() % 300 >= 150;
    },

    /** @returns {{x: number, y: number}|null} */
    getPosition() {
        return this.position;
    },

    /** @returns {object|null} */
    getType() {
        return this.type;
    }
};

export default Food;
