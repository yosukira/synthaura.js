# synthaura.js
Zero-Dependency Procedural Audio Engine for Web Games
# 🎛️ Synthaura.js

**Zero-Dependency Procedural Audio Engine for Web Games.**

Synthaura.js is a lightweight, pure JavaScript library that uses the browser's native `Web Audio API` to generate high-quality sound effects (SFX) and dynamic background music (BGM) purely through code. 

**No `.mp3` or `.wav` files required.** Perfect for[JS13kGames](https://js13kgames.com/), HTML5 Playable Ads, Game Jams, and web-based Metaverse projects where bundle size matters.

![Bundle Size](https://img.shields.io/badge/size-under_10kb-brightgreen)
![Dependencies](https://img.shields.io/badge/dependencies-0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎮 Live Demos (Try it out!)

Hearing is believing. Put on your headphones and check out what procedural audio can do:

* 🕹️ **[Game Demo](https://bsstata.icu:5000)** - A fully playable web game utilizing `Synthaura.js` for all its SFX and BGM. *(Note: Hosted on a custom server, may take a second to load).*

## ✨ Features

- 🚫 **Zero Assets:** Everything is generated mathematically (Oscillators, Noise buffers, Filters). Saves megabytes of bandwidth.
- ⚔️ **Advanced Action SFX:** Built-in generators for Sword Slashes, Magic Spells (Ice/Fire/Lightning), Gunshots, Explosions, and UI clicks.
- 🎵 **Generative BGM:** A dual-clock scheduling engine that generates dynamic, multi-track electronic music (Ambient & Boss Themes).
- 🎛️ **Pro-Grade Routing:** Internal Global Dynamics Compressor (anti-clipping), Impulse Convolver (Reverb), WaveShaper (Distortion), and Sidechaining.
- ⚡ **Performance Optimized:** Built-in throttle locks (`_canPlay`) to prevent audio stacking/clipping, and automatic node garbage collection.

## 📦 Installation

Just drop the module into your project. No NPM required, though you can bundle it easily.

```javascript
import { SynthauraSFX, SynthauraBGM } from './synthaura.js';
```

## 🚀 Quick Start

### 1. Sound Effects (SFX)
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

### 2. Generative Background Music (BGM)
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

## 🧠 How it Works

Synthaura uses Subtractive and FM (Frequency Modulation) synthesis:
- **Wind/Fire/Explosions:** Passes custom-generated Pink/White noise through BiquadFilters and WaveShaper distortion nodes.
- **Hits/Lasers:** Manipulates Oscillator frequency curves using `exponentialRampToValueAtTime` for punchy transients.
- **Music:** Uses a lookahead dual-clock scheduling system to ensure music stays perfectly on beat regardless of the browser's main-thread JavaScript execution.

## 📄 License

MIT License. Free to use in your commercial or open-source games!
