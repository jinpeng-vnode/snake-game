/**
 * js/input.js — 输入模块
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.2
 * 对应UI规格: design/ui/L1-TASK-007-游戏界面优化.md 第三节（虚拟方向键）+ 第十一节（触屏适配）
 *
 * 管理键盘输入（方向键 + WASD + ESC/P 暂停）+ 触屏滑动 + 虚拟方向键，缓存待处理方向。
 */

import { Direction, SWIPE_THRESHOLD, MOBILE_BREAKPOINT } from './constants.js';

/** 方向键 data-dir 属性到 Direction 的映射 */
const DIR_MAP = {
    up:    Direction.UP,
    down:  Direction.DOWN,
    left:  Direction.LEFT,
    right: Direction.RIGHT
};

const Input = {
    /** @type {{dx: number, dy: number}|null} 待处理的方向输入 */
    pendingDirection: null,

    /**
     * 初始化所有输入源
     * @param {function({dx: number, dy: number}): void} onDirection - 方向变更回调
     * @param {function(): void} onAction - 空格键回调
     * @param {function(): void} onPause - 暂停/恢复回调（TASK-004）
     * @returns {void}
     */
    init(onDirection, onAction, onPause) {
        // === 键盘映射（TASK-004 负责，不要修改） ===
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

        // === 触屏初始化（TASK-002） ===
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            this.initTouchSwipe(canvas, onAction);
        }
        this.initVirtualDpad();
        this.updateDpadVisibility();
    },

    /**
     * 初始化触屏滑动（canvas touchstart/touchend）
     * 滑动距离 ≥ SWIPE_THRESHOLD 时触发方向，< SWIPE_THRESHOLD 时触发 onAction（开始/重新开始）
     * @param {HTMLCanvasElement} canvas
     * @param {function(): void} onAction - 点击回调（等同空格键）
     * @returns {void}
     */
    initTouchSwipe(canvas, onAction) {
        let startX = 0;
        let startY = 0;

        canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
        }, { passive: true });

        canvas.addEventListener('touchend', (e) => {
            if (!e.changedTouches.length) return;
            const touch = e.changedTouches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            if (Math.abs(dx) >= SWIPE_THRESHOLD || Math.abs(dy) >= SWIPE_THRESHOLD) {
                // 滑动 → 方向输入
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.pendingDirection = dx > 0 ? Direction.RIGHT : Direction.LEFT;
                } else {
                    this.pendingDirection = dy > 0 ? Direction.DOWN : Direction.UP;
                }
            } else {
                // 短按/点击 → 触发开始/重新开始（等同空格键）
                onAction();
            }
        });
    },

    /**
     * 初始化虚拟方向键（touchstart 事件，防止 300ms 延迟）
     * @returns {void}
     */
    initVirtualDpad() {
        const btns = document.querySelectorAll('.dpad-btn');
        if (!btns.length) return;

        btns.forEach((btn) => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // 防止 300ms 延迟和触发 click
                const dir = DIR_MAP[btn.dataset.dir];
                if (dir) {
                    this.pendingDirection = dir;
                }
            });
        });
    },

    /**
     * 根据屏幕宽度显示/隐藏虚拟方向键，监听 resize
     * 实际显隐由 CSS @media (max-width: 767px) 控制，此处清除可能残留的 inline style
     * @returns {void}
     */
    updateDpadVisibility() {
        const dpad = document.getElementById('dpad');
        if (!dpad) return;

        window.addEventListener('resize', () => {
            // 清除 inline style，让 CSS @media 规则生效
            dpad.style.display = '';
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
