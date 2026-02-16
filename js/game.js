/**
 * js/game.js — Game 主控制器（TASK-006 扩展）
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.9
 *
 * 协调所有子模块，管理游戏生命周期。
 * TASK-006: 集成食物类型系统、效果管理、动态 tick 间隔。
 */

import { GameState, GRID_COUNT, TICK_INTERVAL, FoodType } from './constants.js';
import Snake from './snake.js';
import Food from './food.js';
import Input from './input.js';
import Score from './score.js';
import Renderer from './renderer.js';
import ParticleSystem from './particle.js';
import SoundManager from './sound.js';
import EffectManager from './effect.js';

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

    /** @type {number} 当前 tick 间隔（受效果影响）（TASK-006） */
    currentTickInterval: TICK_INTERVAL,

    /** @type {number} 上一次 tick 的时间戳（用于计算 deltaMs） */
    lastTickTime: 0,

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
            this.handleAction.bind(this),
            this.togglePause.bind(this)
        );

        // TASK-003: 初始化音效系统
        SoundManager.init();

        // TASK-003: 绑定静音按钮
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            muteBtn.textContent = SoundManager.isMuted() ? '🔇' : '🔊';
            muteBtn.addEventListener('click', function() {
                SoundManager.ensureContext();
                SoundManager.toggleMute();
            });
        }

        Score.updateDisplay(this.scoreEl, this.highScoreEl);

        Renderer.drawBackground();
        Renderer.drawReadyScreen();

        // 页面失焦自动暂停（TASK-004）
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state === GameState.PLAYING) {
                this.pause();
            }
        });

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
        } else if (this.state === GameState.PAUSED) {
            this.resume();
        }
    },

    /**
     * 开始游戏
     * @returns {void}
     */
    start() {
        this.state = GameState.PLAYING;

        // TASK-003: 确保 AudioContext 已创建，启动背景音乐
        SoundManager.ensureContext();
        SoundManager.startBgm();

        Snake.init();
        Score.reset();
        Score.updateDisplay(this.scoreEl, this.highScoreEl);

        // TASK-006: 清空效果，重置 tick 间隔
        EffectManager.clear();
        this.currentTickInterval = TICK_INTERVAL;

        // 初始生成普通食物
        Food.spawnType(function(point) { return Snake.occupies(point); }, FoodType.NORMAL);
        ParticleSystem.clear();

        if (this.loopTimer !== null) {
            clearInterval(this.loopTimer);
        }

        Input.consumeDirection();
        this.lastTickTime = Date.now();
        this.loopTimer = setInterval(this.tick.bind(this), this.currentTickInterval);

        this.render();
    },

    /**
     * 暂停游戏（TASK-004）
     * @returns {void}
     */
    pause() {
        if (this.state !== GameState.PLAYING) return;
        this.state = GameState.PAUSED;
        if (this.loopTimer !== null) {
            clearInterval(this.loopTimer);
            this.loopTimer = null;
        }
    },

    /**
     * 恢复游戏（TASK-004）
     * @returns {void}
     */
    resume() {
        if (this.state !== GameState.PAUSED) return;
        this.state = GameState.PLAYING;
        Input.consumeDirection();
        this.lastTickTime = Date.now();
        this.loopTimer = setInterval(this.tick.bind(this), this.currentTickInterval);
    },

    /**
     * 切换暂停/恢复（TASK-004）
     * @returns {void}
     */
    togglePause() {
        if (this.state === GameState.PLAYING) {
            this.pause();
        } else if (this.state === GameState.PAUSED) {
            this.resume();
        }
    },

    /**
     * 游戏主循环
     * @returns {void}
     */
    tick() {
        const now = Date.now();
        const deltaMs = now - this.lastTickTime;
        this.lastTickTime = now;

        // TASK-006: 更新效果剩余时间
        EffectManager.update(deltaMs);

        // TASK-006: 更新食物限时倒计时，超时则生成普通食物
        const expired = Food.updateTimer(deltaMs);
        if (expired) {
            Food.spawnType(function(point) { return Snake.occupies(point); }, FoodType.NORMAL);
        }

        // TASK-006: 动态调整 tick 间隔
        this.updateTickInterval();

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

        // 5. 移动蛇（缩短类食物不生长，其他类型蛇身+1）
        const foodType = Food.getType();
        const shouldGrow = ateFood && foodType !== FoodType.SHRINK;
        Snake.move(shouldGrow);

        // 6. 检测自身碰撞
        if (Snake.checkSelfCollision()) {
            this.gameOver();
            return;
        }

        // 7. 吃到食物后处理
        if (ateFood) {
            // TASK-003: 播放吃食物音效
            SoundManager.playEat();
            // TASK-005: 生成粒子特效
            ParticleSystem.spawn(foodPos.x, foodPos.y);

            // TASK-006: 按食物类型加分（支持双倍得分倍率）
            Score.add(foodType.score, EffectManager.getScoreMultiplier());
            Score.updateDisplay(this.scoreEl, this.highScoreEl);

            // TASK-006: 触发食物特殊效果
            if (foodType.effect && foodType.effectDuration) {
                EffectManager.add(foodType.effect, foodType.effectDuration);
            }

            // TASK-006: 缩短类食物处理
            if (foodType === FoodType.SHRINK) {
                Snake.shrink(2);
            }

            // 检测通关
            if (Snake.getLength() === GRID_COUNT * GRID_COUNT) {
                this.win();
                return;
            }

            // TASK-006: 按概率生成下一个食物
            Food.spawn(function(point) { return Snake.occupies(point); });
        }

        // 8. 渲染
        this.render();
    },

    /**
     * 动态调整 tick 间隔（TASK-006）
     * 根据 EffectManager 的速度倍率调整，变化时重建定时器
     * @returns {void}
     */
    updateTickInterval() {
        const newInterval = Math.round(TICK_INTERVAL * EffectManager.getSpeedMultiplier());
        if (newInterval !== this.currentTickInterval) {
            this.currentTickInterval = newInterval;
            if (this.loopTimer !== null) {
                clearInterval(this.loopTimer);
                this.loopTimer = setInterval(this.tick.bind(this), this.currentTickInterval);
            }
        }
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

        // TASK-003: 播放游戏结束音效，停止背景音乐
        SoundManager.playGameOver();
        SoundManager.stopBgm();

        // TASK-006: 清空效果
        EffectManager.clear();

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

        // TASK-003: 停止背景音乐
        SoundManager.stopBgm();

        // TASK-006: 清空效果
        EffectManager.clear();

        if (this.loopTimer !== null) {
            clearInterval(this.loopTimer);
            this.loopTimer = null;
        }
        this.render();
    },

    /**
     * 渲染当前帧
     * 渲染顺序: 背景 → 墙壁 → 食物 → 蛇 → 粒子 → 效果指示器（TASK-006）
     * @returns {void}
     */
    render() {
        Renderer.drawBackground();
        Renderer.drawWalls();

        // TASK-006: 根据食物类型和闪烁状态绘制
        const foodPos = Food.getPosition();
        const foodType = Food.getType();
        if (foodPos && foodType) {
            Renderer.drawFood(foodPos, foodType, Food.isBlinking());
        }

        Renderer.drawSnake(Snake.segments, Snake.direction);

        // TASK-005: 更新并渲染粒子
        ParticleSystem.update();
        ParticleSystem.render(Renderer.ctx);

        // TASK-006: 绘制效果状态指示器
        Renderer.drawEffectIndicators(EffectManager.getActiveEffects());
    },

    /**
     * 启动渲染循环（含 PAUSED 分支 — TASK-004）
     * @returns {void}
     */
    startRenderLoop() {
        const renderFrame = () => {
            if (this.state === GameState.READY) {
                Renderer.drawBackground();
                Renderer.drawReadyScreen();
            } else if (this.state === GameState.PAUSED) {
                this.render();
                Renderer.drawPausedScreen();
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
