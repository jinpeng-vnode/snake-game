/**
 * game.js — 贪吃蛇游戏全部逻辑
 * 对应架构设计: design/L1-TASK-001-架构设计.md
 * 对应UI规格: design/ui/L1-TASK-002-游戏主界面.md
 *
 * 模块划分: Snake / Food / Renderer / Input / Score / Game（主控制器）
 * 所有模块通过 Game 协调，互不直接调用。
 */

// ========== 常量 ==========

/** @type {number} 画布像素尺寸（动态计算，400-800px） */
let CANVAS_SIZE = 400;

/** @type {number} 网格数量（固定 20×20，用户决策） */
const GRID_COUNT = 20;

/** @type {number} 每格像素尺寸（动态计算） */
let CELL_SIZE = 8;

/** @type {number} 游戏刷新间隔（毫秒） */
const TICK_INTERVAL = 180;

/** @type {number} 每个食物的分值 */
const SCORE_PER_FOOD = 10;

/** @type {string} localStorage 存储键名 */
const HIGH_SCORE_KEY = 'snakeHighScore';

// ========== 方向枚举 ==========

/**
 * 方向定义，值为坐标增量 {dx, dy}
 * @enum {{dx: number, dy: number}}
 */
const Direction = {
    UP:    { dx: 0,  dy: -1 },
    DOWN:  { dx: 0,  dy: 1  },
    LEFT:  { dx: -1, dy: 0  },
    RIGHT: { dx: 1,  dy: 0  }
};

// ========== 游戏状态枚举 ==========

/** @enum {string} */
const GameState = {
    READY:     'ready',
    PLAYING:   'playing',
    GAME_OVER: 'gameOver',
    WIN:       'win'
};

// ========== Snake 模块 ==========

const Snake = {
    /** @type {{x: number, y: number}[]} 蛇身段数组，[0] 为蛇头 */
    segments: [],

    /** @type {{dx: number, dy: number}} 当前移动方向 */
    direction: Direction.RIGHT,

    /**
     * 初始化蛇到默认位置和方向
     * 蛇头 (25,25)，蛇身 (24,25), (23,25)，方向向右（50×50地图中心）
     * @returns {void}
     */
    init() {
        this.segments = [
            { x: 25, y: 25 },
            { x: 24, y: 25 },
            { x: 23, y: 25 }
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
     * 设置移动方向（内部校验禁止掉头）
     * @param {{dx: number, dy: number}} newDirection - 新方向
     * @returns {boolean} 是否设置成功
     */
    setDirection(newDirection) {
        // 禁止掉头：新方向与当前方向相反时忽略
        if (this.direction.dx + newDirection.dx === 0 &&
            this.direction.dy + newDirection.dy === 0) {
            return false;
        }
        this.direction = newDirection;
        return true;
    },

    /**
     * 检测蛇头是否与自身碰撞（从第 1 个元素开始比较）
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
    }
};

// ========== Food 模块 ==========

const Food = {
    /** @type {{x: number, y: number}|null} 当前食物位置 */
    position: null,

    /**
     * 在空白网格上随机生成食物
     * 收集所有空白格坐标，随机选一个（保证不与蛇身重叠）
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
            // 没有空白格，蛇填满了网格
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

// ========== Input 模块 ==========

const Input = {
    /** @type {{dx: number, dy: number}|null} 待处理的方向输入 */
    pendingDirection: null,

    /**
     * 初始化键盘事件监听
     * @param {function({dx: number, dy: number}): void} onDirection - 方向变更回调
     * @param {function(): void} onAction - 空格键回调
     * @returns {void}
     */
    init(onDirection, onAction) {
        // 方向键映射
        const keyMap = {
            'ArrowUp':    Direction.UP,
            'ArrowDown':  Direction.DOWN,
            'ArrowLeft':  Direction.LEFT,
            'ArrowRight': Direction.RIGHT
        };

        document.addEventListener('keydown', (e) => {
            if (keyMap[e.key]) {
                e.preventDefault();
                this.pendingDirection = keyMap[e.key];
            } else if (e.key === ' ') {
                e.preventDefault();
                onAction();
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

// ========== Score 模块 ==========

const Score = {
    /** @type {number} 当前分数 */
    current: 0,

    /** @type {number} 最高分 */
    high: 0,

    /**
     * 初始化：从 localStorage 读取最高分
     * localStorage 不可用时静默降级
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
            // localStorage 不可用（如隐私模式），静默降级
            this.high = 0;
        }
    },

    /**
     * 增加分数，如果超过最高分则更新并持久化
     * @returns {void}
     */
    add() {
        this.current += SCORE_PER_FOOD;
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
     * @param {HTMLElement} scoreEl - 当前分数 DOM 元素
     * @param {HTMLElement} highScoreEl - 最高分 DOM 元素
     * @returns {void}
     */
    updateDisplay(scoreEl, highScoreEl) {
        scoreEl.textContent = '分数: ' + this.current;
        highScoreEl.textContent = '最高分: ' + this.high;
    }
};

// ========== ParticleSystem 模块（L2-TASK-010: 粒子特效系统） ==========

const ParticleSystem = {
    /** @type {Array<{x: number, y: number, vx: number, vy: number, alpha: number, life: number}>} */
    particles: [],
    
    /**
     * 在指定位置生成粒子
     * @param {number} gridX - 网格 X 坐标
     * @param {number} gridY - 网格 Y 坐标
     * @returns {void}
     */
    spawn(gridX, gridY) {
        const centerX = gridX * CELL_SIZE + CELL_SIZE / 2;
        const centerY = gridY * CELL_SIZE + CELL_SIZE / 2;
        const count = 6 + Math.floor(Math.random() * 3); // 6-8 个粒子
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 2 + Math.random() * 2; // 2-4 px/frame
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                life: 15 // 15 帧 ≈ 300ms (at 60fps)
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
            p.alpha = p.life / 15; // 线性淡出
            
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

// ========== Renderer 模块 ==========

const Renderer = {
    /** @type {CanvasRenderingContext2D|null} */
    ctx: null,

    /** @type {HTMLCanvasElement|null} */
    canvas: null,

    /**
     * 初始化渲染器并计算画布尺寸
     * @param {HTMLCanvasElement} canvas
     * @returns {void}
     */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.updateCanvasSize();
        
        // 监听窗口缩放（防抖200ms）
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.updateCanvasSize();
                if (window.Game) window.Game.render();
            }, 200);
        });
    },

    /**
     * 计算并更新画布尺寸（UI规格：400-800px，20的倍数）
     * @returns {void}
     */
    updateCanvasSize() {
        const viewport = Math.min(window.innerWidth, window.innerHeight);
        const base = viewport * 0.8;
        const size = Math.max(400, Math.min(800, Math.floor(base / 20) * 20));
        
        CANVAS_SIZE = size;
        CELL_SIZE = size / GRID_COUNT;
        
        this.canvas.width = size;
        this.canvas.height = size;
    },

    /**
     * 绘制棋盘格背景（UI规格：交替色棋盘格）
     * @returns {void}
     */
    drawBackground() {
        const ctx = this.ctx;
        
        for (let y = 0; y < GRID_COUNT; y++) {
            for (let x = 0; x < GRID_COUNT; x++) {
                ctx.fillStyle = (x + y) % 2 === 0 ? '#1a1a2e' : '#16213e';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    },

    /**
     * 绘制蛇（UI规格：渐变色 #4CAF50 → #81C784 + 蛇头眼睛 + 蛇尾略小）
     * @param {{x: number, y: number}[]} segments
     * @param {{dx: number, dy: number}} direction - 蛇头方向
     * @returns {void}
     */
    drawSnake(segments, direction) {
        const ctx = this.ctx;
        const len = segments.length;
        
        segments.forEach((seg, index) => {
            const x = seg.x * CELL_SIZE + 1;
            const y = seg.y * CELL_SIZE + 1;
            let size = CELL_SIZE - 2;
            
            // 蛇尾略小（最后一节缩小 20%）
            if (index === len - 1) {
                const shrink = CELL_SIZE * 0.1;
                size = CELL_SIZE - 2 - shrink * 2;
            }
            
            if (index === 0) {
                // 蛇头：圆角矩形 + 眼睛
                const radius = CELL_SIZE * 0.3;
                ctx.fillStyle = '#4CAF50';
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + size - radius, y);
                ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
                ctx.lineTo(x + size, y + size - radius);
                ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
                ctx.lineTo(x + radius, y + size);
                ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.fill();
                
                // 眼睛（根据方向调整位置）
                const centerX = x + size / 2;
                const centerY = y + size / 2;
                const eyeRadius = CELL_SIZE * 0.08;
                let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
                
                if (direction.dy === -1) { // UP
                    leftEyeX = centerX - CELL_SIZE * 0.15;
                    leftEyeY = centerY - CELL_SIZE * 0.2;
                    rightEyeX = centerX + CELL_SIZE * 0.15;
                    rightEyeY = centerY - CELL_SIZE * 0.2;
                } else if (direction.dy === 1) { // DOWN
                    leftEyeX = centerX - CELL_SIZE * 0.15;
                    leftEyeY = centerY + CELL_SIZE * 0.2;
                    rightEyeX = centerX + CELL_SIZE * 0.15;
                    rightEyeY = centerY + CELL_SIZE * 0.2;
                } else if (direction.dx === -1) { // LEFT
                    leftEyeX = centerX - CELL_SIZE * 0.2;
                    leftEyeY = centerY - CELL_SIZE * 0.15;
                    rightEyeX = centerX - CELL_SIZE * 0.2;
                    rightEyeY = centerY + CELL_SIZE * 0.15;
                } else { // RIGHT
                    leftEyeX = centerX + CELL_SIZE * 0.2;
                    leftEyeY = centerY - CELL_SIZE * 0.15;
                    rightEyeX = centerX + CELL_SIZE * 0.2;
                    rightEyeY = centerY + CELL_SIZE * 0.15;
                }
                
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // 蛇身：渐变色 #4CAF50 → #81C784
                const progress = index / Math.max(len - 1, 1);
                const r = Math.round(76 + (129 - 76) * progress);
                const g = Math.round(175 + (199 - 175) * progress);
                const b = Math.round(80 + (132 - 80) * progress);
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                
                const radius = CELL_SIZE * 0.2;
                
                // 蛇尾需要调整绘制位置（居中）
                let drawX = x;
                let drawY = y;
                if (index === len - 1) {
                    const shrink = CELL_SIZE * 0.1;
                    drawX = x + shrink;
                    drawY = y + shrink;
                }
                
                ctx.beginPath();
                ctx.moveTo(drawX + radius, drawY);
                ctx.lineTo(drawX + size - radius, drawY);
                ctx.quadraticCurveTo(drawX + size, drawY, drawX + size, drawY + radius);
                ctx.lineTo(drawX + size, drawY + size - radius);
                ctx.quadraticCurveTo(drawX + size, drawY + size, drawX + size - radius, drawY + size);
                ctx.lineTo(drawX + radius, drawY + size);
                ctx.quadraticCurveTo(drawX, drawY + size, drawX, drawY + size - radius);
                ctx.lineTo(drawX, drawY + radius);
                ctx.quadraticCurveTo(drawX, drawY, drawX + radius, drawY);
                ctx.closePath();
                ctx.fill();
            }
        });
    },

    /**
     * 绘制食物（UI规格：苹果造型 = 主体 + 高光 + 茎 + 叶子）
     * @param {{x: number, y: number}} position
     * @returns {void}
     */
    drawFood(position) {
        const ctx = this.ctx;
        const centerX = position.x * CELL_SIZE + CELL_SIZE / 2;
        const centerY = position.y * CELL_SIZE + CELL_SIZE / 2;
        
        // 苹果主体
        ctx.fillStyle = '#F44336';
        ctx.beginPath();
        ctx.arc(centerX, centerY, CELL_SIZE * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(centerX - CELL_SIZE * 0.15, centerY - CELL_SIZE * 0.15, CELL_SIZE * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        // 茎
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(
            centerX - CELL_SIZE * 0.04,
            centerY - CELL_SIZE * 0.55,
            CELL_SIZE * 0.08,
            CELL_SIZE * 0.15
        );
        
        // 叶子（椭圆，旋转30度）
        ctx.save();
        ctx.translate(centerX + CELL_SIZE * 0.1, centerY - CELL_SIZE * 0.35);
        ctx.rotate(30 * Math.PI / 180);
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.ellipse(0, 0, CELL_SIZE * 0.2, CELL_SIZE * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    /**
     * 绘制开始界面（UI规格：动态字号）
     * @returns {void}
     */
    drawReadyScreen() {
        const ctx = this.ctx;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        // 标题（字号 = 画布尺寸 / 8.33）
        ctx.font = `bold ${Math.floor(CANVAS_SIZE / 8.33)}px Arial, sans-serif`;
        ctx.fillText('贪吃蛇', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 40);

        // 提示（字号 = 画布尺寸 / 20）
        ctx.font = `${Math.floor(CANVAS_SIZE / 20)}px Arial, sans-serif`;
        ctx.fillText('按空格键开始游戏', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20);
    },

    /**
     * 绘制游戏结束界面（UI规格：动态字号）
     * @param {number} finalScore
     * @returns {void}
     */
    drawGameOverScreen(finalScore) {
        const ctx = this.ctx;
        
        // 遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        // 标题（字号 = 画布尺寸 / 11.11）
        ctx.font = `bold ${Math.floor(CANVAS_SIZE / 11.11)}px Arial, sans-serif`;
        ctx.fillText('游戏结束', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 60);

        // 最终分数（字号 = 画布尺寸 / 16.67）
        ctx.font = `${Math.floor(CANVAS_SIZE / 16.67)}px Arial, sans-serif`;
        ctx.fillText('最终分数: ' + finalScore, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

        // 重新开始提示（字号 = 画布尺寸 / 22.22）
        ctx.font = `${Math.floor(CANVAS_SIZE / 22.22)}px Arial, sans-serif`;
        ctx.fillText('按空格键重新开始', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 60);
    },

    /**
     * 绘制通关界面（UI规格：动态字号）
     * @param {number} finalScore
     * @returns {void}
     */
    drawWinScreen(finalScore) {
        const ctx = this.ctx;
        
        // 遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        // 标题（字号 = 画布尺寸 / 11.11）
        ctx.font = `bold ${Math.floor(CANVAS_SIZE / 11.11)}px Arial, sans-serif`;
        ctx.fillText('恭喜通关', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 60);

        // 最终分数（字号 = 画布尺寸 / 16.67）
        ctx.font = `${Math.floor(CANVAS_SIZE / 16.67)}px Arial, sans-serif`;
        ctx.fillText('最终分数: ' + finalScore, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

        // 重新开始提示（字号 = 画布尺寸 / 22.22）
        ctx.font = `${Math.floor(CANVAS_SIZE / 22.22)}px Arial, sans-serif`;
        ctx.fillText('按空格键重新开始', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 60);
    }
};

// ========== Game 主控制器 ==========

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
        // 获取 DOM 元素
        const canvas = document.getElementById('gameCanvas');
        this.scoreEl = document.getElementById('score');
        this.highScoreEl = document.getElementById('highScore');

        // 初始化子模块
        Renderer.init(canvas);
        Score.init();
        Input.init(
            // 方向变更回调（仅缓存，不直接设置蛇方向）
            function(_dir) { /* Input 内部已缓存 pendingDirection */ },
            // 空格键回调
            this.handleAction.bind(this)
        );

        // 更新分数面板显示
        Score.updateDisplay(this.scoreEl, this.highScoreEl);

        // 绘制开始界面
        Renderer.drawBackground();
        Renderer.drawReadyScreen();

        // 启动渲染循环
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
     * 开始游戏：重置蛇和分数，生成食物，启动游戏循环
     * @returns {void}
     */
    start() {
        this.state = GameState.PLAYING;

        // 重置子模块
        Snake.init();
        Score.reset();
        Score.updateDisplay(this.scoreEl, this.highScoreEl);
        Food.spawn(function(point) { return Snake.occupies(point); });

        // 清除可能存在的旧定时器
        if (this.loopTimer !== null) {
            clearInterval(this.loopTimer);
        }

        // 清空待处理的方向输入，防止上局残留
        Input.consumeDirection();

        // 启动游戏循环
        this.loopTimer = setInterval(this.tick.bind(this), TICK_INTERVAL);

        // 渲染第一帧
        this.render();
    },

    /**
     * 游戏主循环（每 TICK_INTERVAL 毫秒执行一次）
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

        // 6. 检测自身碰撞（移动后检测）
        if (Snake.checkSelfCollision()) {
            this.gameOver();
            return;
        }

        // 7. 吃到食物后加分并生成新食物
        if (ateFood) {
            Score.add();
            Score.updateDisplay(this.scoreEl, this.highScoreEl);

            // 检测通关
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
     * 渲染当前帧：背景 → 食物 → 蛇
     * @returns {void}
     */
    render() {
        Renderer.drawBackground();
        const foodPos = Food.getPosition();
        if (foodPos) {
            Renderer.drawFood(foodPos);
        }
        Renderer.drawSnake(Snake.segments, Snake.direction);
    },

    /**
     * 启动渲染循环（简化版）
     * @returns {void}
     */
    startRenderLoop() {
        const renderFrame = () => {
            if (this.state === GameState.READY) {
                Renderer.drawBackground();
                Renderer.drawReadyScreen();
            } else if (this.state === GameState.GAME_OVER) {
                Renderer.drawGameOverScreen(Score.current);
            } else if (this.state === GameState.WIN) {
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

// ========== 页面加载后启动 ==========

window.addEventListener('DOMContentLoaded', function() {
    Game.init();
});
