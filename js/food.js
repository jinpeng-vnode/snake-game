/**
 * js/food.js — 食物模块
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.5
 *
 * 管理食物的生成和位置。
 */

import { GRID_COUNT } from './constants.js';

const Food = {
    /** @type {{x: number, y: number}|null} 当前食物位置 */
    position: null,

    /**
     * 在空白网格上随机生成食物
     * @param {function({x: number, y: number}): boolean} isOccupied - 判断坐标是否被占据
     * @returns {void}
     */
    spawn(isOccupied) {
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
            return;
        }
        const index = Math.floor(Math.random() * emptyCells.length);
        this.position = emptyCells[index];
    },

    /**
     * 获取当前食物位置
     * @returns {{x: number, y: number}|null}
     */
    getPosition() {
        return this.position;
    }
};

export default Food;
