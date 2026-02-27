/**
 * Synthaura.js - Zero-Dependency Procedural Audio Engine
 * Pure Web Audio API. No external assets needed.
 * Ideal for JS13k, Web Games, and Game Jams.
 */

export class SynthauraSFX {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
        this.reverbEnabled = true;
        this.crunchEnabled = true;

        // 1. Global Dynamics Compressor (Anti-clipping)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -20;
        this.compressor.knee.value = 40;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.005;
        this.compressor.release.value = 0.25;
        this.compressor.connect(this.ctx.destination);

        // 2. Convolver Reverb
        this.reverbNode = this.ctx.createConvolver();
        this.reverbNode.buffer = this._createImpulseResponse(1.5, 2.0);
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.3;
        this.reverbNode.connect(this.reverbGain);
        this.reverbGain.connect(this.compressor);

        // 3. Distortion / Crunch Node
        this.crunchNode = this.ctx.createWaveShaper();
        this.crunchNode.curve = this._makeDistortionCurve(200);
        this.crunchMasterGain = this.ctx.createGain();
        this.crunchMasterGain.gain.value = 0.15; 
        this.crunchNode.connect(this.crunchMasterGain);
        this.crunchMasterGain.connect(this.compressor);

        // 4. Noise Buffers (Pre-generated for performance)
        this.whiteNoise = this._createNoiseBuffer('white');
        this.pinkNoise = this._createNoiseBuffer('pink');

        // State trackers
        this.lastPlayTimes = {}; 
        this.gemCombo = 0;
        this.gemResetTimer = null;
        this.activeLoops = new Map();
    }

    // --- Core Audio Routing ---
    playLayer(source, useReverb = true, useCrunch = false) {
        source.connect(this.compressor); // Dry signal
        if (useReverb && this.reverbEnabled) source.connect(this.reverbNode);
        if (useCrunch && this.crunchEnabled) source.connect(this.crunchNode);
    }

    _canPlay(id, cooldownMs) {
        const now = Date.now();
        const last = this.lastPlayTimes[id] || 0;
        if (now - last < cooldownMs) return false;
        this.lastPlayTimes[id] = now;
        return true;
    }

    // --- Generators ---
    _createNoiseBuffer(type = 'white') {
        const size = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        if (type === 'white') {
            for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        } else if (type === 'pink') {
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < size; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                data[i] *= 0.11;
                b6 = white * 0.115926;
            }
        }
        return buffer;
    }

    _createImpulseResponse(duration, decay) {
        const rate = this.ctx.sampleRate;
        const length = rate * duration;
        const impulse = this.ctx.createBuffer(2, length, rate);
        for (let i = 0; i < length; i++) {
            const n = i / length;
            const vol = Math.pow(1 - n, decay);
            impulse.getChannelData(0)[i] = (Math.random() * 2 - 1) * vol;
            impulse.getChannelData(1)[i] = (Math.random() * 2 - 1) * vol;
        }
        return impulse;
    }

    _makeDistortionCurve(amount) {
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; ++i) {
            const x = i * 2 / n - 1;
            curve[i] = (3 + amount) * x * 20 * (Math.PI / 180) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    _playWhoosh(freqStart, duration, volume, type = 'lowpass', Q = 1) {
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.whiteNoise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = type; filter.Q.value = Q;
        const gain = this.ctx.createGain();

        src.connect(filter); filter.connect(gain);
        this.playLayer(gain, true, false);

        filter.frequency.setValueAtTime(freqStart, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + duration);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

        src.start(t); src.stop(t + duration + 0.1);
    }

    // ==========================================
    // PUBLIC API: Sound Effects
    // ==========================================

    resume() { if (this.ctx.state === 'suspended') this.ctx.resume(); }

    playSwordSlashLight() {
        if (!this.enabled) return;
        this.resume();
        this._playWhoosh(1800, 0.15, 0.3, 'highpass', 0.5);
        this._playWhoosh(1200, 0.2, 0.15, 'bandpass', 1);
    }

    playSwordSlashHeavy() {
        if (!this.enabled) return;
        this.resume();
        this._playWhoosh(800, 0.4, 1.0, 'lowpass', 1);
        this._playWhoosh(3000, 0.3, 0.2, 'bandpass', 5);
        // Kick punch
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        this.playLayer(gain, false, false);
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 0.3);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
    }

    playGunshot() {
        this.resume();
        const t = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource(); noise.buffer = this.whiteNoise;
        const nFilter = this.ctx.createBiquadFilter(); nFilter.type = 'bandpass'; nFilter.frequency.value = 2500;
        const nGain = this.ctx.createGain();
        noise.connect(nFilter); nFilter.connect(nGain);
        this.playLayer(nGain, false, true);
        nGain.gain.setValueAtTime(0.25, t); nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        noise.start(t); noise.stop(t + 0.1);
    }

    playMagicIceCast() {
        this.resume();
        if (!this._canPlay('iceCast', 100)) return;
        const t = this.ctx.currentTime;[1200, 1800].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq + ((Math.random() - 0.5) * 50);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.1, t + 0.05 + i * 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.connect(g);
            this.playLayer(g, true, false); // Ethereal reverb
            osc.start(t + i * 0.05); osc.stop(t + 0.6);
        });
    }

    playHitCrunchy() {
        if (!this.enabled || !this._canPlay('hitCrunchy', 50)) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.connect(gain);
        this.playLayer(gain, false, false);
        osc.start(t); osc.stop(t + 0.1);
    }

    // Add more of your amazing methods here... (playGemPickup, playShieldBreak, etc.)
}

export class SynthauraBGM {
    /**
     * @param {Object} options 
     * @param {Function} options.onBeat - Callback for visualizers: (time, type) => {}
     */
    constructor(options = {}) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.bpm = 128;
        this.noteLength = 60 / this.bpm / 4;
        this.isPlaying = false;
        this.nextNoteTime = 0;
        this.tick = 0;
        this.measure = 0;
        this.currentTrack = 'ambient';
        this.onBeat = options.onBeat || (() => {});

        // Pro-grade Routing
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -12;
        this.compressor.connect(this.ctx.destination);

        this.master = this.ctx.createGain();
        this.master.gain.value = 0.2;
        this.master.connect(this.compressor);

        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = this._createImpulse(3.0, 2.0);
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.35;
        this.reverb.connect(this.reverbGain);
        this.reverbGain.connect(this.master);

        this.sidechainBus = this.ctx.createGain();
        this.sidechainBus.connect(this.master);
        this.sidechainBus.connect(this.reverb);

        this.scales = {
            mainTheme:[130.81, 146.83, 155.56, 174.61, 196.00, 207.65, 246.94], 
            ambient:[146.83, 116.54, 174.61, 130.81] 
        };
        this.noiseBuffer = this._createNoiseBuffer();
    }

    _createNoiseBuffer() {
        const b = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        return b;
    }

    _createImpulse(duration, decay) {
        const len = this.ctx.sampleRate * duration;
        const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
        for (let i = 0; i < len; i++) {
            const k = Math.pow(1 - i / len, decay);
            buf.getChannelData(0)[i] = (Math.random() * 2 - 1) * k;
            buf.getChannelData(1)[i] = (Math.random() * 2 - 1) * k;
        }
        return buf;
    }

    getFreq(scaleName, index) {
        const scale = this.scales[scaleName];
        if (!scale) return 440;
        const len = scale.length;
        const octaveOffset = Math.floor(index / len);
        return scale[index % len] * Math.pow(2, octaveOffset);
    }

    switchTrack(trackName) {
        if (this.currentTrack === trackName) return;
        this.currentTrack = trackName;
        this.tick = 0;
        this.measure = 0;
        this.bpm = trackName === 'mainTheme' ? 135 : 90;
        this.master.gain.setTargetAtTime(trackName === 'mainTheme' ? 0.2 : 0.15, this.ctx.currentTime, 0.5);
        this.noteLength = 60 / this.bpm / 4;
        this.nextNoteTime = this.ctx.currentTime + 0.05;
    }

    // --- Synthesizers ---
    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.connect(gain); gain.connect(this.master);
        osc.start(time); osc.stop(time + 0.5);

        // Sidechain Ducking
        this.sidechainBus.gain.cancelScheduledValues(time);
        this.sidechainBus.gain.setValueAtTime(0.3, time);
        this.sidechainBus.gain.exponentialRampToValueAtTime(1.0, time + 0.15);
        
        this.onBeat(time, 'kick');
    }

    playSnare(time) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 1500;
        const gain = this.ctx.createGain();
        noise.connect(filter); filter.connect(gain); gain.connect(this.sidechainBus);
        gain.gain.setValueAtTime(0.7, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        noise.start(time); noise.stop(time + 0.2);
        this.onBeat(time, 'snare');
    }

    // ... (Keep other synth methods: playHihat, playSuperSawBass, playFMLead, playSynth) ...

    schedule() {
        const lookahead = 0.1;
        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
            const currentBar = Math.floor(this.measure);
            if (this.currentTrack === 'mainTheme') {
                this.playMainThemePattern(this.nextNoteTime, this.tick, currentBar);
            } else {
                this.playAmbientPattern(this.nextNoteTime, this.tick, currentBar);
            }
            this.nextNoteTime += this.noteLength;
            this.tick++;
            if (this.tick >= 16) {
                this.tick = 0;
                this.measure++;
            }
        }
        if (this.isPlaying) setTimeout(() => this.schedule(), 25);
    }

    playAmbientPattern(time, tick, bar) {
        const rootFreq = this.scales.ambient[bar % 4];
        if (tick === 0 && bar % 2 === 0) {
            this.playSynth(rootFreq * 2, time, this.noteLength * 32, 'triangle');
        }
        if (tick % 4 === 0) this.playKick(time); // Simplified for example
    }

    playMainThemePattern(time, tick, bar) {
        // Simple 4-on-the-floor demo
        if (tick % 4 === 0) this.playKick(time);
        if (tick % 8 === 4) this.playSnare(time);
    }

    start() {
        if (this.isPlaying) return;
        this.ctx.resume();
        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.schedule();
    }

    stop() {
        this.isPlaying = false;
        this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        setTimeout(() => this.master.gain.value = 1, 200);
    }
}
