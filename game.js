/**
 * game.js — 贪吃蛇游戏全部逻辑
 * 对应架构设计: design/L1-TASK-001-架构设计.md
 * 对应UI规格: design/ui/L1-TASK-002-游戏主界面.md
 *
 * 模块划分: Snake / Food / Renderer / Input / Score / Game（主控制器）
 * 所有模块通过 Game 协调，互不直接调用。
 */

// ========== 常量 ==========

/** @type {number} 画布像素尺寸（L2-TASK-008: 400→600） */
const CANVAS_SIZE = 600;

/** @type {number} 网格数量（每行/每列）（L2-TASK-008: 20→30） */
const GRID_COUNT = 30;

/** @type {number} 每格像素尺寸 */
const CELL_SIZE = 20;

/** @type {number} 游戏刷新间隔（毫秒）（L2-TASK-008: 200→180，提升流畅度） */
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
     * 蛇头 (15,15)，蛇身 (14,15), (13,15)，方向向右（L2-TASK-008: 调整到30×30地图中心）
     * @returns {void}
     */
    init() {
        this.segments = [
            { x: 15, y: 15 },
            { x: 14, y: 15 },
            { x: 13, y: 15 }
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

// ========== Renderer 模块 ==========

const Renderer = {
    /** @type {CanvasRenderingContext2D|null} */
    ctx: null,

    /**
     * 初始化渲染器
     * @param {HTMLCanvasElement} canvas
     * @returns {void}
     */
    init(canvas) {
        this.ctx = canvas.getContext('2d');
    },

    /**
     * 清空画布并绘制网格背景
     * 背景色 #1a1a2e，网格线 #16213e
     * @returns {void}
     */
    drawBackground() {
        const ctx = this.ctx;
        // 填充背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        // 绘制网格线
        ctx.strokeStyle = '#16213e';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_COUNT; i++) {
            const pos = i * CELL_SIZE;
            // 垂直线
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, CANVAS_SIZE);
            ctx.stroke();
            // 水平线
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(CANVAS_SIZE, pos);
            ctx.stroke();
        }
    },

    /**
     * 绘制蛇
     * 蛇头 #388E3C，蛇身 #4CAF50，18×18px 带 2px 圆角
     * @param {{x: number, y: number}[]} segments
     * @returns {void}
     */
    drawSnake(segments) {
        const ctx = this.ctx;
        segments.forEach((seg, index) => {
            ctx.fillStyle = index === 0 ? '#388E3C' : '#4CAF50';
            // 每格内留 1px 间隙，绘制 18×18
            const x = seg.x * CELL_SIZE + 1;
            const y = seg.y * CELL_SIZE + 1;
            const size = CELL_SIZE - 2;
            const radius = 2;
            // 绘制圆角矩形
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
        });
    },

    /**
     * 绘制食物
     * 红色圆形 #F44336，直径 16px，居中于网格
     * @param {{x: number, y: number}} position
     * @returns {void}
     */
    drawFood(position) {
        const ctx = this.ctx;
        ctx.fillStyle = '#F44336';
        const centerX = position.x * CELL_SIZE + CELL_SIZE / 2;
        const centerY = position.y * CELL_SIZE + CELL_SIZE / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fill();
    },

    /**
     * 绘制开始界面
     * "贪吃蛇" 48px + "按空格键开始游戏" 20px
     * @returns {void}
     */
    drawReadyScreen() {
        const ctx = this.ctx;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 标题
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial, sans-serif';
        ctx.fillText('贪吃蛇', CANVAS_SIZE / 2, 160);

        // 提示
        ctx.font = '20px Arial, sans-serif';
        ctx.fillText('按空格键开始游戏', CANVAS_SIZE / 2, 220);
    },

    /**
     * 绘制游戏结束界面
     * 半透明遮罩 + "游戏结束" + 最终分数 + 重新开始提示
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

        // 标题
        ctx.font = '36px Arial, sans-serif';
        ctx.fillText('游戏结束', CANVAS_SIZE / 2, 140);

        // 最终分数
        ctx.font = '24px Arial, sans-serif';
        ctx.fillText('最终分数: ' + finalScore, CANVAS_SIZE / 2, 200);

        // 重新开始提示
        ctx.font = '18px Arial, sans-serif';
        ctx.fillText('按空格键重新开始', CANVAS_SIZE / 2, 260);
    },

    /**
     * 绘制通关界面
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

        // 标题
        ctx.font = '36px Arial, sans-serif';
        ctx.fillText('恭喜通关', CANVAS_SIZE / 2, 140);

        // 最终分数
        ctx.font = '24px Arial, sans-serif';
        ctx.fillText('最终分数: ' + finalScore, CANVAS_SIZE / 2, 200);

        // 重新开始提示
        ctx.font = '18px Arial, sans-serif';
        ctx.fillText('按空格键重新开始', CANVAS_SIZE / 2, 260);
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
        // 渲染最后一帧（蛇和食物保持最后位置）
        this.render();
        Renderer.drawGameOverScreen(Score.current);
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
        Renderer.drawWinScreen(Score.current);
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
        Renderer.drawSnake(Snake.segments);
    }
};

// ========== 页面加载后启动 ==========

window.addEventListener('DOMContentLoaded', function() {
    Game.init();
});
