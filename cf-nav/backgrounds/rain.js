/**
 * RainSimulator - 高真实度 2D/3D 透视下雨模拟器 (原生 JavaScript)
 * 支持多层景深、高速线条拉丝、风速倾角、音效合成与雷电模拟
 */
class RainSimulator {
    /**
     * @param {HTMLCanvasElement} canvas - 绘图用的 Canvas 元素
     * @param {Object} [options] - 配置参数
     */
    constructor(canvas, options = {}) {
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error("RainSimulator: 请传入有效的 HTMLCanvasElement 对象。");
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // 默认配置
        this.config = Object.assign({
            density: 280,             // 雨滴数量 (20~600)
            horizonY: 0.48,            // 地面/视平线位置 (0.1 ~ 0.85)
            wind: -2.5,               // 风力风向 (-8.0 ~ 8.0)
            thicknessMultiplier: 1.8,  // 雨丝粗细 (0.8 ~ 4.0)
            enableAudio: false,        // 是否默认启用音频
            autoResize: true           // 是否自动监听 window resize
        }, options);

        // 内部状态
        this.raindrops = [];
        this.animationFrameId = null;
        this.isRunning = false;
        this.lightningAlpha = 0.0;

        // Web Audio 音频相关变量
        this.audioCtx = null;
        this.isAudioPlaying = false;
        this.rainGainNode = null;
        this.rainFilterNode = null;
        this.pitterPatterTimer = null;

        this._bindEvents();
        this.resize();
        this._syncRaindropsCount();
    }

    /**
     * 绑定 Resize 事件
     */
    _bindEvents() {
        this._handleResize = () => {
            if (this.config.autoResize) {
                this.resize();
            }
        };
        window.addEventListener('resize', this._handleResize);
    }

    /**
     * 调整 Canvas 尺寸（自动匹配容器或窗口）
     */
    resize() {
        const rect = this.canvas.parentElement 
            ? this.canvas.parentElement.getBoundingClientRect() 
            : { width: window.innerWidth, height: window.innerHeight };

        this.canvas.width = Math.max(1, rect.width || window.innerWidth);
        this.canvas.height = Math.max(1, rect.height || window.innerHeight);
        this._syncRaindropsCount();
    }

    /**
     * 内部雨滴粒子类
     */
    _createRaindropClass() {
        const self = this;
        return class Raindrop {
            constructor() {
                this.reset(true);
            }

            reset(initial = false) {
                const w = Math.max(1, self.canvas.width);
                const h = Math.max(1, self.canvas.height);
                const horizonPixel = h * self.config.horizonY;

                // 4层景深视差 (0: 远景细雨, 1: 中远景, 2: 中近景, 3: 前景大雨)
                this.layer = Math.floor(Math.random() * 4);
                
                // 随机生成坐标
                this.x = Math.random() * (w + 600) - 300;
                this.y = initial ? Math.random() * h : -100 - Math.random() * 200;

                const depthRatio = (this.layer + 1) / 4;
                
                // 高速坠落 (28~56px/帧)，避免漂浮雪花感
                this.speed = (28 + Math.random() * 28) * depthRatio;
                // 长线条视觉暂留拉丝 (55~130px)
                this.length = (55 + Math.random() * 75) * depthRatio;

                // 粗细计算
                const baseWidth = (this.layer === 3) ? (1.4 + Math.random() * 0.8) :
                                  (this.layer === 2) ? (1.0 + Math.random() * 0.5) :
                                  (this.layer === 1) ? (0.6 + Math.random() * 0.4) : (0.4 + Math.random() * 0.3);
                
                this.thickness = baseWidth * (0.6 + self.config.thicknessMultiplier * 0.3);

                // 落地目标线 (受视平线透视影响)
                this.impactY = horizonPixel + Math.random() * (h - horizonPixel);
                this.alpha = (0.3 + Math.random() * 0.5) * depthRatio;
            }

            update() {
                this.x += self.config.wind;
                this.y += this.speed;

                // 触地重置
                if (this.y >= this.impactY) {
                    this.reset();
                }

                // 越界重置
                if (this.y > self.canvas.height + 120 || this.x < -400 || this.x > self.canvas.width + 400) {
                    this.reset();
                }
            }

            draw(ctx) {
                const windOffset = self.config.wind * (this.length / this.speed);
                const startX = this.x - windOffset;
                const startY = this.y - this.length;

                // 线性渐变尾迹，头部高亮、尾部淡出
                const grad = ctx.createLinearGradient(startX, startY, this.x, this.y);
                grad.addColorStop(0, `rgba(200, 230, 255, 0)`);
                grad.addColorStop(0.7, `rgba(225, 242, 255, ${this.alpha * 0.6})`);
                grad.addColorStop(1, `rgba(255, 255, 255, ${this.alpha})`);

                ctx.beginPath();
                ctx.strokeStyle = grad;
                ctx.lineWidth = this.thickness;
                ctx.lineCap = 'butt'; // 干脆利落的拉丝切口
                ctx.moveTo(startX, startY);
                ctx.lineTo(this.x, this.y);
                ctx.stroke();
            }
        };
    }

    /**
     * 同步雨滴粒子数量
     */
    _syncRaindropsCount() {
        const Raindrop = this._createRaindropClass();
        while (this.raindrops.length < this.config.density) {
            this.raindrops.push(new Raindrop());
        }
        if (this.raindrops.length > this.config.density) {
            this.raindrops.length = this.config.density;
        }
    }

    /**
     * 动态修改参数
     * @param {Object} newConfig 
     */
    updateConfig(newConfig = {}) {
        Object.assign(this.config, newConfig);
        this._syncRaindropsCount();
        this._updateAudioIntensity();
    }

    /**
     * 核心渲染循环
     */
    _animate() {
        if (!this.isRunning) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.clearRect(0, 0, w, h);

        // 地面水汽/雨雾光晕层
        const horizonPixel = h * this.config.horizonY;
        if (horizonPixel < h) {
            const mistGrad = this.ctx.createLinearGradient(0, horizonPixel - 40, 0, horizonPixel + 160);
            const hazeAlpha = 0.04 + (this.config.density / 600) * 0.08;
            mistGrad.addColorStop(0, 'rgba(180, 215, 235, 0)');
            mistGrad.addColorStop(0.4, `rgba(170, 210, 230, ${hazeAlpha})`);
            mistGrad.addColorStop(1, 'rgba(180, 215, 235, 0)');
            this.ctx.fillStyle = mistGrad;
            this.ctx.fillRect(0, horizonPixel - 40, w, 200);
        }

        // 闪电闪烁
        if (this.lightningAlpha > 0) {
            this.ctx.fillStyle = `rgba(240, 248, 255, ${this.lightningAlpha})`;
            this.ctx.fillRect(0, 0, w, h);
            this.lightningAlpha -= 0.04;
        }

        // 更新并绘制所有雨滴
        for (let i = 0; i < this.raindrops.length; i++) {
            this.raindrops[i].update();
            this.raindrops[i].draw(this.ctx);
        }

        this.animationFrameId = requestAnimationFrame(() => this._animate());
    }

    /**
     * 启动模拟器
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this._animate();
    }

    /**
     * 暂停模拟器
     */
    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * 触发一次夜空闪电效果
     */
    triggerLightning() {
        this.lightningAlpha = 0.85;
    }

    /**
     * 初始化 Web Audio 环境下雨音效 (立体声 + 滴答声)
     */
    initAudio() {
        if (this.audioCtx) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();

        // 1. 生成双声道 Pink/Brown 噪声 Buffer
        const bufferSize = 3 * this.audioCtx.sampleRate;
        const noiseBuffer = this.audioCtx.createBuffer(2, bufferSize, this.audioCtx.sampleRate);
        const left = noiseBuffer.getChannelData(0);
        const right = noiseBuffer.getChannelData(1);

        let b0L=0, b1L=0, b2L=0, b3L=0, b4L=0, b5L=0;
        let b0R=0, b1R=0, b2R=0, b3R=0, b4R=0, b5R=0;

        for (let i = 0; i < bufferSize; i++) {
            let whiteL = Math.random() * 2 - 1;
            b0L = 0.99886 * b0L + whiteL * 0.0555179;
            b1L = 0.99332 * b1L + whiteL * 0.0750759;
            b2L = 0.96900 * b2L + whiteL * 0.1538520;
            b3L = 0.86650 * b3L + whiteL * 0.3104856;
            b4L = 0.55000 * b4L + whiteL * 0.5329522;
            b5L = -0.7616 * b5L - whiteL * 0.0168980;
            left[i] = (b0L + b1L + b2L + b3L + b4L + b5L + whiteL * 0.5362) * 0.032;

            let whiteR = Math.random() * 2 - 1;
            b0R = 0.99886 * b0R + whiteR * 0.0555179;
            b1R = 0.99332 * b1R + whiteR * 0.0750759;
            b2R = 0.96900 * b2R + whiteR * 0.1538520;
            b3R = 0.86650 * b3R + whiteR * 0.3104856;
            b4R = 0.55000 * b4R + whiteR * 0.5329522;
            b5R = -0.7616 * b5R - whiteR * 0.0168980;
            right[i] = (b0R + b1R + b2R + b3R + b4R + b5R + whiteR * 0.5362) * 0.032;
        }

        const noiseNode = this.audioCtx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;

        // 高通与低通滤波器
        const hpFilter = this.audioCtx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(180, this.audioCtx.currentTime);

        this.rainFilterNode = this.audioCtx.createBiquadFilter();
        this.rainFilterNode.type = 'lowpass';
        const initialFreq = 900 + (this.config.density / 600) * 2600;
        this.rainFilterNode.frequency.setValueAtTime(initialFreq, this.audioCtx.currentTime);

        // 风势变幻 LFO
        const lfo = this.audioCtx.createOscillator();
        lfo.frequency.setValueAtTime(0.12, this.audioCtx.currentTime);
        const lfoGain = this.audioCtx.createGain();
        lfoGain.gain.setValueAtTime(200, this.audioCtx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(this.rainFilterNode.frequency);
        lfo.start();

        // 主增益控制
        this.rainGainNode = this.audioCtx.createGain();
        const initialGain = 0.08 + (this.config.density / 600) * 0.22;
        this.rainGainNode.gain.setValueAtTime(initialGain, this.audioCtx.currentTime);

        // 节点连接
        noiseNode.connect(hpFilter);
        hpFilter.connect(this.rainFilterNode);
        this.rainFilterNode.connect(this.rainGainNode);
        this.rainGainNode.connect(this.audioCtx.destination);

        noiseNode.start();
        this._startPitterPatterLoop();
    }

    /**
     * 切换声音开/关
     */
    toggleAudio() {
        if (!this.audioCtx) {
            this.initAudio();
        }

        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        this.isAudioPlaying = !this.isAudioPlaying;

        if (this.rainGainNode) {
            const targetGain = this.isAudioPlaying 
                ? (0.08 + (this.config.density / 600) * 0.22) 
                : 0.0001;
            this.rainGainNode.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.1);
        }

        return this.isAudioPlaying;
    }

    _startPitterPatterLoop() {
        if (this.pitterPatterTimer) clearInterval(this.pitterPatterTimer);
        this.pitterPatterTimer = setInterval(() => {
            if (!this.isAudioPlaying || !this.audioCtx) return;
            const prob = 0.25 + (this.config.density / 600) * 0.65;
            if (Math.random() < prob) {
                this._playMicroPatterDrop();
            }
        }, 45);
    }

    _playMicroPatterDrop() {
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            const filter = this.audioCtx.createBiquadFilter();

            const baseFreq = 1400 + Math.random() * 2600;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.35, this.audioCtx.currentTime + 0.02);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime);
            filter.Q.setValueAtTime(2.8, this.audioCtx.currentTime);

            const dropVol = 0.003 + Math.random() * 0.010;
            gain.gain.setValueAtTime(dropVol, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.022);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.022);
        } catch (e) {}
    }

    _updateAudioIntensity() {
        if (!this.audioCtx || !this.isAudioPlaying) return;
        const norm = Math.min(1, Math.max(0, this.config.density / 600));
        const targetFreq = 900 + norm * 2600;
        const targetGain = 0.08 + norm * 0.22;

        this.rainFilterNode.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.1);
        this.rainGainNode.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.1);
    }

    /**
     * 销毁实例并清理内存
     */
    destroy() {
        this.stop();
        window.removeEventListener('resize', this._handleResize);
        if (this.pitterPatterTimer) clearInterval(this.pitterPatterTimer);
        if (this.audioCtx) {
            this.audioCtx.close();
        }
        this.raindrops = [];
    }
}

// 支持 ES Module 导出或挂载到 global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RainSimulator;
} else if (typeof define === 'function' && define.amd) {
    define([], () => RainSimulator);
} else {
    window.RainSimulator = RainSimulator;
}