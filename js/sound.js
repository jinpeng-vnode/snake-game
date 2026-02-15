/**
 * js/sound.js — 音效管理模块
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.3
 *
 * Web Audio API 程序化生成音效，不依赖外部音频文件。
 * 遵循浏览器自动播放策略：首次用户交互后才创建 AudioContext。
 */

import { MUTE_KEY } from './constants.js';

const SoundManager = {
    /** @type {AudioContext|null} */
    ctx: null,
    /** @type {boolean} */
    muted: false,
    /** @type {OscillatorNode|null} */
    bgmOscillator: null,
    /** @type {GainNode|null} */
    bgmGain: null,

    /**
     * 初始化：读取 localStorage 静音状态
     * @returns {void}
     */
    init() {
        try {
            this.muted = localStorage.getItem(MUTE_KEY) === 'true';
        } catch (_e) {
            this.muted = false;
        }
    },

    /**
     * 确保 AudioContext 已创建（首次用户交互时调用）
     * @returns {void}
     */
    ensureContext() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (_e) {
            // AudioContext 不可用，静默降级
            this.ctx = null;
        }
    },

    /**
     * 播放吃食物音效（短促上升音调）
     * @returns {void}
     */
    playEat() {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(1047, this.ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + 0.15);
        } catch (_e) {
            // 静默降级
        }
    },

    /**
     * 播放游戏结束音效（低沉下降音调）
     * @returns {void}
     */
    playGameOver() {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + 0.5);
        } catch (_e) {
            // 静默降级
        }
    },

    /**
     * 开始背景音乐循环（简单低音循环）
     * @returns {void}
     */
    startBgm() {
        if (this.muted || !this.ctx || this.bgmOscillator) return;
        try {
            this.bgmOscillator = this.ctx.createOscillator();
            this.bgmGain = this.ctx.createGain();
            this.bgmOscillator.connect(this.bgmGain);
            this.bgmGain.connect(this.ctx.destination);
            this.bgmOscillator.type = 'sine';
            this.bgmOscillator.frequency.setValueAtTime(110, this.ctx.currentTime);
            this.bgmGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            this.bgmOscillator.start();
        } catch (_e) {
            this.bgmOscillator = null;
            this.bgmGain = null;
        }
    },

    /**
     * 停止背景音乐
     * @returns {void}
     */
    stopBgm() {
        if (this.bgmOscillator) {
            try {
                this.bgmOscillator.stop();
            } catch (_e) {
                // 已停止
            }
            this.bgmOscillator = null;
            this.bgmGain = null;
        }
    },

    /**
     * 切换静音，持久化到 localStorage，更新按钮图标
     * @returns {void}
     */
    toggleMute() {
        this.muted = !this.muted;
        try {
            localStorage.setItem(MUTE_KEY, String(this.muted));
        } catch (_e) {
            // 静默忽略
        }
        // 更新按钮图标
        const btn = document.getElementById('muteBtn');
        if (btn) {
            btn.textContent = this.muted ? '🔇' : '🔊';
        }
        // 静音时停止背景音乐，取消静音时恢复
        if (this.muted) {
            this.stopBgm();
        } else {
            this.startBgm();
        }
    },

    /**
     * @returns {boolean}
     */
    isMuted() {
        return this.muted;
    }
};

export default SoundManager;
