/**
 * js/snake.js — 蛇模块
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.1
 *
 * 管理蛇身段、移动、方向、碰撞检测。
 */

import { Direction } from './constants.js';

const Snake = {
    /** @type {{x: number, y: number}[]} 蛇身段数组，[0] 为蛇头 */
    segments: [],

    /** @type {{dx: number, dy: number}} 当前移动方向 */
    direction: Direction.RIGHT,

    /**
     * 初始化蛇到默认位置和方向
     * @returns {void}
     */
    init() {
        this.segments = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        this.direction = Direction.RIGHT;
    },

    /**
     * 获取蛇头位置
     * @returns {{x: number, y: number}}
     */
    getHead() {
        return this.segments[0];
    },

    /**
     * 移动蛇：头部按方向延伸一格
     * @param {boolean} grow - 是否生长（true 则不移除尾部）
     * @returns {void}
     */
    move(grow) {
        const head = this.getHead();
        const newHead = {
            x: head.x + this.direction.dx,
            y: head.y + this.direction.dy
        };
        this.segments.unshift(newHead);
        if (!grow) {
            this.segments.pop();
        }
    },

    /**
     * 设置移动方向（禁止掉头）
     * @param {{dx: number, dy: number}} newDirection
     * @returns {boolean} 是否设置成功
     */
    setDirection(newDirection) {
        if (this.direction.dx + newDirection.dx === 0 &&
            this.direction.dy + newDirection.dy === 0) {
            return false;
        }
        this.direction = newDirection;
        return true;
    },

    /**
     * 检测蛇头是否与自身碰撞
     * @returns {boolean}
     */
    checkSelfCollision() {
        const head = this.getHead();
        for (let i = 1; i < this.segments.length; i++) {
            if (this.segments[i].x === head.x && this.segments[i].y === head.y) {
                return true;
            }
        }
        return false;
    },

    /**
     * 检测指定坐标是否在蛇身上
     * @param {{x: number, y: number}} point
     * @returns {boolean}
     */
    occupies(point) {
        return this.segments.some(seg => seg.x === point.x && seg.y === point.y);
    },

    /**
     * 获取蛇身长度
     * @returns {number}
     */
    getLength() {
        return this.segments.length;
    },

    /**
     * 缩短蛇身（最短保持 1 节）（TASK-006）
     * @param {number} count - 缩短节数
     * @returns {void}
     */
    shrink(count) {
        const minLength = 1;
        const removeCount = Math.min(count, this.segments.length - minLength);
        if (removeCount > 0) {
            this.segments.splice(-removeCount, removeCount);
        }
    }
};

export default Snake;
