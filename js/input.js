/**
 * js/input.js — 输入模块
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.2
 *
 * 管理键盘输入（方向键 + WASD + ESC/P 暂停），缓存待处理方向。
 */

import { Direction } from './constants.js';

const Input = {
    /** @type {{dx: number, dy: number}|null} 待处理的方向输入 */
    pendingDirection: null,

    /**
     * 初始化键盘事件监听
     * @param {function({dx: number, dy: number}): void} onDirection - 方向变更回调
     * @param {function(): void} onAction - 空格键回调
     * @param {function(): void} onPause - 暂停/恢复回调（TASK-004）
     * @returns {void}
     */
    init(onDirection, onAction, onPause) {
        // 方向键 + WASD 映射
        const keyMap = {
            'ArrowUp':    Direction.UP,
            'ArrowDown':  Direction.DOWN,
            'ArrowLeft':  Direction.LEFT,
            'ArrowRight': Direction.RIGHT,
            'w': Direction.UP,
            'W': Direction.UP,
            'a': Direction.LEFT,
            'A': Direction.LEFT,
            's': Direction.DOWN,
            'S': Direction.DOWN,
            'd': Direction.RIGHT,
            'D': Direction.RIGHT
        };

        document.addEventListener('keydown', (e) => {
            if (keyMap[e.key]) {
                e.preventDefault();
                this.pendingDirection = keyMap[e.key];
            } else if (e.key === ' ') {
                e.preventDefault();
                onAction();
            } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                onPause();
            }
        });
    },

    /**
     * 消费并返回待处理的方向输入，返回后清空
     * @returns {{dx: number, dy: number}|null}
     */
    consumeDirection() {
        const dir = this.pendingDirection;
        this.pendingDirection = null;
        return dir;
    }
};

export default Input;
