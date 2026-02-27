# 🎛️ Synthaura.js

**[English](#english) | [简体中文](#简体中文)**

---

<h2 id="english">🇬🇧 English</h2>

**Zero-Dependency Procedural Audio Engine for Web Games.**

Synthaura.js is a lightweight, pure JavaScript library that uses the browser's native `Web Audio API` to generate high-quality sound effects (SFX) and dynamic background music (BGM) purely through code. 

**No `.mp3` or `.wav` files required.** Perfect for [JS13kGames](https://js13kgames.com/), HTML5 Playable Ads, Game Jams, and web-based Metaverse projects where bundle size matters.

![Bundle Size](https://img.shields.io/badge/size-under_10kb-brightgreen)
![Dependencies](https://img.shields.io/badge/dependencies-0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

### 🎮 Live Demos (Try it out!)

Hearing is believing. Put on your headphones and check out what procedural audio can do:

* 🕹️ **[Game Demo](https://bsstata.icu:5000)** - A fully playable web game utilizing `Synthaura.js` for all its SFX and BGM. *(Note: Hosted on a custom server, may take a second to load).*

### ✨ Features

- 🚫 **Zero Assets:** Everything is generated mathematically (Oscillators, Noise buffers, Filters). Saves megabytes of bandwidth.
- ⚔️ **Advanced Action SFX:** Built-in generators for Sword Slashes, Magic Spells (Ice/Fire/Lightning), Gunshots, Explosions, and UI clicks.
- 🎵 **Generative BGM:** A dual-clock scheduling engine that generates dynamic, multi-track electronic music (Ambient & Boss Themes).
- 🎛️ **Pro-Grade Routing:** Internal Global Dynamics Compressor (anti-clipping), Impulse Convolver (Reverb), WaveShaper (Distortion), and Sidechaining.
- ⚡ **Performance Optimized:** Built-in throttle locks (`_canPlay`) to prevent audio stacking/clipping, and automatic node garbage collection.

### 📦 Installation

Just drop the module into your project. No NPM required, though you can bundle it easily.

```javascript
import { SynthauraSFX, SynthauraBGM } from './synthaura.js';
```

### 🚀 Quick Start

**1. Sound Effects (SFX)**
```javascript
const sfx = new SynthauraSFX();

// Call this on a user interaction (click/touch) to initialize AudioContext
document.body.addEventListener('click', () => {
    sfx.resume();
});

// Play procedural sounds!
sfx.playSwordSlashHeavy();
sfx.playGunshot();
sfx.playMagicIceCast();
```

**2. Generative Background Music (BGM)**
```javascript
// Initialize with an optional beat-sync callback for UI Visualizers
const bgm = new SynthauraBGM({
    onBeat: (time, type) => {
        console.log(`Beat detected at ${time}, type: ${type}`);
        // Trigger your CSS animations or Canvas particles here!
    }
});

// Start the music engine
document.getElementById('start-btn').addEventListener('click', () => {
    bgm.start();
    bgm.switchTrack('mainTheme'); // Switch between 'ambient' and 'mainTheme'
});
```

### 🧠 How it Works
Synthaura uses Subtractive and FM (Frequency Modulation) synthesis. It passes custom-generated Pink/White noise through BiquadFilters and WaveShaper distortion nodes for environmental sounds, and manipulates Oscillator frequency curves using `exponentialRampToValueAtTime` for punchy transients.

### 📄 License
MIT License. Free to use in your commercial or open-source games!

### This project was built with the assistance of AI.

---

<h2 id="简体中文">🇨🇳 简体中文</h2>

**零依赖、纯程序化生成的 Web 游戏音频引擎。**

Synthaura.js 是一个轻量级的纯 JavaScript 库，它利用浏览器原生的 `Web Audio API`，完全依靠代码和数学公式生成高质量的音效（SFX）和动态背景音乐（BGM）。

**不需要加载任何 `.mp3` 或 `.wav` 音频文件。** 非常适合对包体大小有极致要求的场景，如 [JS13kGames](https://js13kgames.com/) 比赛、HTML5 试玩广告（Playable Ads）、Game Jam 游戏开发以及轻量级元宇宙项目。

### 🎮 在线演示体验

戴上耳机，亲自体验纯代码合成的声音魔法：

* 🕹️ **[游戏Demo](https://bsstata.icu:5000)** - 这是一个完整的可玩网页游戏，其所有的动作音效和背景音乐均由 `Synthaura.js` 生成。（注：部署在独立服务器，首次加载请稍候）

### ✨ 核心特性

- 🚫 **零资源占用 (Zero Assets):** 所有声音通过振荡器、噪声缓冲和滤波器由数学公式实时合成，为你省下数 MB 的带宽和加载时间。
- ⚔️ **高级动作游戏音效:** 内置了针对动作游戏调优的发生器，包括：多级剑气挥砍、魔法（冰霜/火焰/雷电）、枪击、爆炸以及清脆的 UI 反馈声。
- 🎵 **生成式背景音乐 (Generative BGM):** 采用双时钟（Dual-Clock）调度引擎，确保音乐在浏览器主线程下绝对精准，可自动生成动态电子乐（氛围乐与 Boss 战曲目无缝切换）。
- 🎛️ **专业级音频链路:** 引擎内部构建了完整的现代音频链路，包含：全局动态压缩器（防止爆音）、脉冲卷积混响（增加空间感）、波形失真（增加金属/撕裂质感）以及侧链（Sidechaining）。
- ⚡ **极致性能优化:** 内置防抖节流锁（`_canPlay` 机制）防止同一帧音频堆叠导致爆音，并自动处理音频节点的垃圾回收。

### 📦 安装说明

无需 NPM 安装，直接将脚本引入你的前端项目即可。

```javascript
import { SynthauraSFX, SynthauraBGM } from './synthaura.js';
```

### 🚀 快速开始

**1. 触发音效 (SFX)**
```javascript
const sfx = new SynthauraSFX();

// 必须在用户的交互事件（点击/触摸）中恢复 AudioContext 才能发声
document.body.addEventListener('click', () => {
    sfx.resume();
});

// 播放程序化生成的音效！
sfx.playSwordSlashHeavy(); // 重剑挥砍
sfx.playGunshot();         // 枪击
sfx.playMagicIceCast();    // 冰霜魔法
```

**2. 播放生成式音乐 (BGM)**
```javascript
// 初始化，可传入一个可选的回调函数，用于制作与音乐节拍同步的 UI 动效
const bgm = new SynthauraBGM({
    onBeat: (time, type) => {
        console.log(`检测到节拍：时间 ${time}, 类型: ${type}`);
        // 在这里触发你的 CSS 动画或 Canvas 粒子爆炸！
    }
});

// 启动音乐引擎
document.getElementById('start-btn').addEventListener('click', () => {
    bgm.start();
    bgm.switchTrack('mainTheme'); // 在 'ambient' (氛围) 和 'mainTheme' (激昂) 之间切换
});
```

### 🧠 工作原理
Synthaura 采用了减法合成（Subtractive）与 FM 调频合成。例如：风声、火焰和爆炸声是通过将自定义生成的粉红/白噪声输入 BiquadFilters 和 WaveShaper 失真节点生成的；而打击、激光等声音则是利用 `exponentialRampToValueAtTime` 操控振荡器的频率/音量包络曲线，以获得极佳的瞬态打击感。

### 📄 开源协议
采用 MIT 协议，你可以自由地将其用于你的开源或商业游戏中！

### 本项目由AI辅助构建。
