/**
 * js/sound.js — SoundManager 音效模块
 * 对应设计文档: design/L1-TASK-002-007-手机版与体验优化总体设计.md 第五节 5.3
 * 对应UI规格: design/ui/L1-TASK-007-游戏界面优化.md 第四节（静音按钮）
 *
 * 使用 Web Audio API 合成音效，不依赖音频文件。
 * AudioContext 在用户首次交互后才创建（浏览器策略）。
 * 静音状态持久化到 localStorage。
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
     * 初始化：读取 localStorage 静音状态。不创建 AudioContext
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
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (_e) {
                this.ctx = null;
                return;
            }
        }
        // 浏览器策略：AudioContext 可能处于 suspended 状态，需在用户交互中 resume
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
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
            osc.type = 'square';
            const now = this.ctx.currentTime;
            // 短促上升音调：300Hz → 600Hz，持续 0.1s
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
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
            const now = this.ctx.currentTime;
            // 低沉下降音调：400Hz → 100Hz，持续 0.5s
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.5);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } catch (_e) {
            // 静默降级
        }
    },

    /**
     * 开始背景音乐循环（简单低音振荡）
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
            this.bgmOscillator.frequency.setValueAtTime(80, this.ctx.currentTime);
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
                // 已停止则忽略
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
            // localStorage 不可用则不持久化
        }
        // 更新按钮图标
        const btn = document.getElementById('muteBtn');
        if (btn) {
            btn.textContent = this.muted ? '🔇' : '🔊';
        }
        // 静音时停止 BGM，取消静音时恢复
        if (this.muted) {
            this.stopBgm();
        } else {
            this.ensureContext();
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
