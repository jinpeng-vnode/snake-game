/**
 * js/game.js — Game 主控制器
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.9
 *
 * 协调所有子模块，管理游戏生命周期。
 */

import { GameState, GRID_COUNT, TICK_INTERVAL } from './constants.js';
import Snake from './snake.js';
import Food from './food.js';
import Input from './input.js';
import Score from './score.js';
import Renderer from './renderer.js';
import ParticleSystem from './particle.js';

const Game = {
    /** @type {string} 当前游戏状态 */
    state: GameState.READY,

    /** @type {number|null} 游戏循环定时器 ID */
    loopTimer: null,

    /** @type {HTMLElement|null} 分数 DOM 元素 */
    scoreEl: null,

    /** @type {HTMLElement|null} 最高分 DOM 元素 */
    highScoreEl: null,

    /** @type {number|null} 动画帧 ID */
    animationFrameId: null,

    /**
     * 初始化游戏：获取 DOM 元素，初始化所有子模块，绘制开始界面
     * @returns {void}
     */
    init() {
        const canvas = document.getElementById('gameCanvas');
        this.scoreEl = document.getElementById('score');
        this.highScoreEl = document.getElementById('highScore');

        Renderer.init(canvas);
        Score.init();
        Input.init(
            function(_dir) { /* Input 内部已缓存 pendingDirection */ },
            this.handleAction.bind(this)
        );

        Score.updateDisplay(this.scoreEl, this.highScoreEl);

        Renderer.drawBackground();
        Renderer.drawReadyScreen();

        this.startRenderLoop();
    },

    /**
     * 空格键处理：根据当前状态决定行为
     * @returns {void}
     */
    handleAction() {
        if (this.state === GameState.READY ||
            this.state === GameState.GAME_OVER ||
            this.state === GameState.WIN) {
            this.start();
        }
    },

    /**
     * 开始游戏
     * @returns {void}
     */
    start() {
        this.state = GameState.PLAYING;

        Snake.init();
        Score.reset();
        Score.updateDisplay(this.scoreEl, this.highScoreEl);
        Food.spawn(function(point) { return Snake.occupies(point); });

        if (this.loopTimer !== null) {
            clearInterval(this.loopTimer);
        }

        // TASK-005: 开始时清空粒子
        ParticleSystem.clear();

        Input.consumeDirection();

        this.loopTimer = setInterval(this.tick.bind(this), TICK_INTERVAL);

        this.render();
    },

    /**
     * 游戏主循环
     * @returns {void}
     */
    tick() {
        // 1. 消费输入方向
        const dir = Input.consumeDirection();
        if (dir) {
            Snake.setDirection(dir);
        }

        // 2. 计算蛇头新位置
        const head = Snake.getHead();
        const newHead = {
            x: head.x + Snake.direction.dx,
            y: head.y + Snake.direction.dy
        };

        // 3. 检测墙壁碰撞
        if (this.checkWallCollision(newHead)) {
            this.gameOver();
            return;
        }

        // 4. 检测是否吃到食物
        const foodPos = Food.getPosition();
        const ateFood = foodPos && newHead.x === foodPos.x && newHead.y === foodPos.y;

        // 5. 移动蛇
        Snake.move(ateFood);

        // 6. 检测自身碰撞
        if (Snake.checkSelfCollision()) {
            this.gameOver();
            return;
        }

        // 7. 吃到食物后加分并生成新食物
        if (ateFood) {
            // TASK-005: 吃食物时生成粒子特效
            ParticleSystem.spawn(foodPos.x, foodPos.y);

            Score.add();
            Score.updateDisplay(this.scoreEl, this.highScoreEl);

            if (Snake.getLength() === GRID_COUNT * GRID_COUNT) {
                this.win();
                return;
            }

            Food.spawn(function(point) { return Snake.occupies(point); });
        }

        // 8. 渲染
        this.render();
    },

    /**
     * 检测蛇头是否超出网格边界
     * @param {{x: number, y: number}} head
     * @returns {boolean}
     */
    checkWallCollision(head) {
        return head.x < 0 || head.x >= GRID_COUNT ||
               head.y < 0 || head.y >= GRID_COUNT;
    },

    /**
     * 结束游戏
     * @returns {void}
     */
    gameOver() {
        this.state = GameState.GAME_OVER;
        if (this.loopTimer !== null) {
            clearInterval(this.loopTimer);
            this.loopTimer = null;
        }
        this.render();
    },

    /**
     * 通关处理
     * @returns {void}
     */
    win() {
        this.state = GameState.WIN;
        if (this.loopTimer !== null) {
            clearInterval(this.loopTimer);
            this.loopTimer = null;
        }
        this.render();
    },

    /**
     * 渲染当前帧
     * 渲染顺序: 背景 → 墙壁 → 食物 → 蛇 → 粒子（TASK-005）
     * @returns {void}
     */
    render() {
        Renderer.drawBackground();
        Renderer.drawWalls();
        const foodPos = Food.getPosition();
        if (foodPos) {
            Renderer.drawFood(foodPos);
        }
        Renderer.drawSnake(Snake.segments, Snake.direction);
        // TASK-005: 更新并渲染粒子
        ParticleSystem.update();
        ParticleSystem.render(Renderer.ctx);
    },

    /**
     * 启动渲染循环
     * @returns {void}
     */
    startRenderLoop() {
        const renderFrame = () => {
            if (this.state === GameState.READY) {
                Renderer.drawBackground();
                Renderer.drawReadyScreen();
            } else if (this.state === GameState.GAME_OVER) {
                this.render();
                Renderer.drawGameOverScreen(Score.current);
            } else if (this.state === GameState.WIN) {
                this.render();
                Renderer.drawWinScreen(Score.current);
            }
            this.animationFrameId = requestAnimationFrame(renderFrame);
        };
        this.animationFrameId = requestAnimationFrame(renderFrame);
    },

    /**
     * 停止渲染循环
     * @returns {void}
     */
    stopRenderLoop() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
};

export default Game;
