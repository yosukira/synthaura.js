/**
 * Synthaura.js - Zero-Dependency Procedural Audio Engine v2.0
 * Pure Web Audio API. No external assets needed.
 */

let _sharedCtx = null;

export function getSharedAudioContext() {
    if (!_sharedCtx) {
        _sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return _sharedCtx;
}

function makeCleanup(...nodes) {
    let done = false;
    return () => {
        if (done) return;
        done = true;
        for (const node of nodes) {
            try { node.disconnect(); } catch (_) {}
        }
    };
}

function _makeDistortionCurve(amount) {
    const n = 44100, curve = new Float32Array(n), k = Math.PI + amount;
    for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = k * x / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}

function _createNoiseBuffer(ctx, type = 'white') {
    const size = ctx.sampleRate * 2;
    const buf  = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    if (type === 'white') {
        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    } else {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < size; i++) {
            const w = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + w * 0.0555179;
            b1 = 0.99332 * b1 + w * 0.0750759;
            b2 = 0.96900 * b2 + w * 0.1538520;
            b3 = 0.86650 * b3 + w * 0.3104856;
            b4 = 0.55000 * b4 + w * 0.5329522;
            b5 = -0.7616  * b5 - w * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
            b6 = w * 0.115926;
        }
    }
    return buf;
}

function _createImpulse(ctx, duration, decay) {
    const len = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let i = 0; i < len; i++) {
        const k = Math.pow(1 - i / len, decay);
        buf.getChannelData(0)[i] = (Math.random() * 2 - 1) * k;
        buf.getChannelData(1)[i] = (Math.random() * 2 - 1) * k;
    }
    return buf;
}

// ── SynthauraSFX ───────────────────────────────────────────────────────────

export class SynthauraSFX {
    constructor(options = {}) {
        this.ctx           = options.ctx || getSharedAudioContext();
        this.enabled       = true;
        this.reverbEnabled = options.reverb !== false;
        this.crunchEnabled = options.crunch !== false;

        this._compressor = this.ctx.createDynamicsCompressor();
        this._compressor.threshold.value = -20;
        this._compressor.knee.value      = 40;
        this._compressor.ratio.value     = 12;
        this._compressor.attack.value    = 0.005;
        this._compressor.release.value   = 0.25;
        this._compressor.connect(this.ctx.destination);

        this._reverbNode = this.ctx.createConvolver();
        this._reverbNode.buffer = _createImpulse(this.ctx, 1.5, 2.0);
        this._reverbGain = this.ctx.createGain();
        this._reverbGain.gain.value = 0.3;
        this._reverbNode.connect(this._reverbGain);
        this._reverbGain.connect(this._compressor);

        this._crunchNode = this.ctx.createWaveShaper();
        this._crunchNode.curve = _makeDistortionCurve(100);
        this._crunchGain = this.ctx.createGain();
        this._crunchGain.gain.value = 0.15;
        this._crunchNode.connect(this._crunchGain);
        this._crunchGain.connect(this._compressor);

        this._whiteNoise = _createNoiseBuffer(this.ctx, 'white');
        this._pinkNoise  = _createNoiseBuffer(this.ctx, 'pink');
        this._lastPlayTimes = {};
    }

    resume()  { if (this.ctx.state === 'suspended') this.ctx.resume(); }

    destroy() {
        this._compressor.disconnect();
        this._reverbNode.disconnect();
        this._reverbGain.disconnect();
        this._crunchNode.disconnect();
        this._crunchGain.disconnect();
    }

    playSwordSlashLight() {
        if (!this.enabled) return;
        this.resume();
        this._playWhoosh(1800, 0.15, 0.30, 'highpass', 0.5);
        this._playWhoosh(1200, 0.20, 0.15, 'bandpass', 1.0);
    }

    playSwordSlashHeavy() {
        if (!this.enabled) return;
        this.resume();
        this._playWhoosh(800,  0.40, 1.0, 'lowpass',  1.0);
        this._playWhoosh(3000, 0.30, 0.2, 'bandpass', 5.0);
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 0.3);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain);
        this._route(gain, false, false);
        osc.start(t); osc.stop(t + 0.3);
        osc.onended = makeCleanup(osc, gain);
    }

    playGunshot() {
        if (!this.enabled) return;
        this.resume();
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
        src.buffer = this._whiteNoise;
        filter.type = 'bandpass'; filter.frequency.value = 2500;
        src.connect(filter); filter.connect(gain);
        this._route(gain, false, true);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        src.start(t); src.stop(t + 0.1);
        src.onended = makeCleanup(src, filter, gain);
    }

    playMagicIceCast() {
        if (!this.enabled || !this._canPlay('iceCast', 100)) return;
        this.resume();
        const t = this.ctx.currentTime;
        [1200, 1800].forEach((freq, i) => {
            const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq + (Math.random() - 0.5) * 50;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.1, t + 0.05 + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.connect(gain);
            this._route(gain, true, false);
            osc.start(t + i * 0.05); osc.stop(t + 0.6);
            osc.onended = makeCleanup(osc, gain);
        });
    }

    playHitCrunchy() {
        if (!this.enabled || !this._canPlay('hitCrunchy', 50)) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.connect(gain);
        this._route(gain, false, false);
        osc.start(t); osc.stop(t + 0.1);
        osc.onended = makeCleanup(osc, gain);
    }

    playExplosion() {
        if (!this.enabled || !this._canPlay('explosion', 150)) return;
        this.resume();
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
        src.buffer = this._pinkNoise;
        filter.type = 'lowpass'; filter.frequency.value = 400;
        gain.gain.setValueAtTime(1.0, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
        src.connect(filter); filter.connect(gain);
        this._route(gain, true, false);
        src.start(t); src.stop(t + 1.3);
        src.onended = makeCleanup(src, filter, gain);

        const osc = this.ctx.createOscillator(), og = this.ctx.createGain();
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
        og.gain.setValueAtTime(0.8, t);
        og.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        osc.connect(og);
        this._route(og, false, false);
        osc.start(t); osc.stop(t + 0.4);
        osc.onended = makeCleanup(osc, og);
    }

    playPickup() {
        if (!this.enabled || !this._canPlay('pickup', 80)) return;
        this.resume();
        const t = this.ctx.currentTime;
        [523, 659, 784].forEach((freq, i) => {
            const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
            const st = t + i * 0.07;
            osc.type = 'sine'; osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, st);
            gain.gain.linearRampToValueAtTime(0.15, st + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, st + 0.18);
            osc.connect(gain);
            this._route(gain, true, false);
            osc.start(st); osc.stop(st + 0.2);
            osc.onended = makeCleanup(osc, gain);
        });
    }

    playUIClick() {
        if (!this.enabled) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain);
        this._route(gain, false, false);
        osc.start(t); osc.stop(t + 0.06);
        osc.onended = makeCleanup(osc, gain);
    }

    _route(gainNode, useReverb, useCrunch) {
        gainNode.connect(this._compressor);
        if (useReverb && this.reverbEnabled) gainNode.connect(this._reverbNode);
        if (useCrunch && this.crunchEnabled) gainNode.connect(this._crunchNode);
    }

    _canPlay(id, cooldownMs) {
        const now = Date.now(), last = this._lastPlayTimes[id] || 0;
        if (now - last < cooldownMs) return false;
        this._lastPlayTimes[id] = now;
        return true;
    }

    _playWhoosh(freqStart, duration, volume, filterType, Q) {
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
        src.buffer = this._whiteNoise; filter.type = filterType; filter.Q.value = Q;
        src.connect(filter); filter.connect(gain);
        this._route(gain, true, false);
        filter.frequency.setValueAtTime(freqStart, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + duration);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        src.start(t); src.stop(t + duration + 0.1);
        src.onended = makeCleanup(src, filter, gain);
    }
}

// ── SynthauraBGM ───────────────────────────────────────────────────────────

const SECTIONS = {
    INTRO:     { start: 0,  end: 8  },
    VERSE:     { start: 8,  end: 16 },
    CHORUS:    { start: 16, end: 32 },
    BREAKDOWN: { start: 32, end: 40 },
    BUILD:     { start: 40, end: 48 },
    OUTRO:     { start: 48, end: Infinity },
};

export class SynthauraBGM {
    constructor(options = {}) {
        this.ctx          = options.ctx || getSharedAudioContext();
        this.onBeat       = options.onBeat || (() => {});
        this.bpm          = 128;
        this.noteLength   = 60 / this.bpm / 4;
        this.isPlaying    = false;
        this.nextNoteTime = 0;
        this.tick         = 0;
        this.measure      = 0;
        this.currentTrack = 'ambient';

        this._compressor = this.ctx.createDynamicsCompressor();
        this._compressor.threshold.value = -12;
        this._compressor.connect(this.ctx.destination);

        this._master = this.ctx.createGain();
        this._master.gain.value = 0.2;
        this._master.connect(this._compressor);

        this._reverb = this.ctx.createConvolver();
        this._reverb.buffer = _createImpulse(this.ctx, 3.0, 2.0);
        this._reverbGain = this.ctx.createGain();
        this._reverbGain.gain.value = 0.35;
        this._reverb.connect(this._reverbGain);
        this._reverbGain.connect(this._master);

        this._sidechainBus = this.ctx.createGain();
        this._sidechainBus.connect(this._master);
        this._sidechainBus.connect(this._reverb);

        this._noiseBuffer = _createNoiseBuffer(this.ctx, 'white');

        this.scales = {
            mainTheme: [130.81, 146.83, 155.56, 174.61, 196.00, 207.65, 233.08],
            ambient:   [233.08, 207.65, 174.61, 155.56],
        };

        this._initWorker();
    }

    start() {
        if (this.isPlaying) return;
        this.ctx.resume();
        this.isPlaying    = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        const targetVol   = this.currentTrack === 'mainTheme' ? 0.2 : 0.15;
        this._master.gain.cancelScheduledValues(this.ctx.currentTime);
        this._master.gain.setValueAtTime(0, this.ctx.currentTime);
        this._master.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.3);
        this._worker.postMessage('start');
    }

    stop() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        this._worker.postMessage('stop');
        this._master.gain.cancelScheduledValues(this.ctx.currentTime);
        this._master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }

    switchTrack(trackName) {
        if (this.currentTrack === trackName) return;
        const FADE = 0.15;
        const now  = this.ctx.currentTime;
        this._master.gain.cancelScheduledValues(now);
        this._master.gain.setTargetAtTime(0, now, FADE / 3);
        setTimeout(() => {
            this.currentTrack = trackName;
            this.tick         = 0;
            this.measure      = 0;
            this.bpm          = trackName === 'mainTheme' ? 135 : 90;
            this.noteLength   = 60 / this.bpm / 4;
            this.nextNoteTime = this.ctx.currentTime + 0.05;
            const targetVol   = trackName === 'mainTheme' ? 0.2 : 0.15;
            this._master.gain.cancelScheduledValues(this.ctx.currentTime);
            this._master.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.3);
        }, FADE * 1000);
    }

    destroy() {
        this.stop();
        setTimeout(() => {
            this._worker.terminate();
            this._compressor.disconnect();
            this._master.disconnect();
            this._reverb.disconnect();
            this._reverbGain.disconnect();
            this._sidechainBus.disconnect();
        }, 500);
    }

    getFreq(scaleName, index) {
        const scale = this.scales[scaleName];
        if (!scale) return 440;
        const len = scale.length;
        return scale[((index % len) + len) % len] * Math.pow(2, Math.floor(index / len));
    }

    _initWorker() {
        const blob = new Blob([`
            let id = null;
            self.onmessage = e => {
                if (e.data === 'start')      { id = setInterval(() => postMessage('tick'), 25); }
                else if (e.data === 'stop')  { clearInterval(id); id = null; }
            };
        `], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        this._worker = new Worker(url);
        URL.revokeObjectURL(url);
        this._worker.onmessage = () => this._schedule();
    }

    _schedule() {
        const lookahead = 0.1;
        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
            const bar = Math.floor(this.measure);
            if (this.currentTrack === 'mainTheme') this._playMainThemePattern(this.nextNoteTime, this.tick, bar);
            else                                   this._playAmbientPattern(this.nextNoteTime, this.tick, bar);
            this.nextNoteTime += this.noteLength;
            if (++this.tick >= 16) { this.tick = 0; this.measure++; }
        }
    }

    _playAmbientPattern(time, tick, bar) {
        const root = this.scales.ambient[bar % 4];
        if (tick === 0 && bar % 2 === 0) {
            this._playSynth(root * 2,   time, this.noteLength * 32, 'triangle');
            this._playSynth(root * 1.5, time, this.noteLength * 32, 'sine');
        }
        if (tick % 4 === 0) {
            this._playSynth(root / 2, time, this.noteLength * 3, 'sine');
        }
        if (Math.random() > 0.85) {
            const freq = root * [1, 1.25, 1.5, 1.75][Math.floor(Math.random() * 4)] * 2;
            this._playSynth(freq, time, 0.3, 'sine');
        }
    }

    _playMainThemePattern(time, tick, bar) {
        this._playDrums(time, tick, bar);
        this._playBass(time, tick, bar);
        this._playLead(time, tick, bar);
    }

    _playDrums(time, tick, bar) {
        if (bar < SECTIONS.VERSE.start) return;
        const isBreakdown = bar >= SECTIONS.BREAKDOWN.start && bar < SECTIONS.BREAKDOWN.end;
        const isBuild     = bar >= SECTIONS.BUILD.start     && bar < SECTIONS.BUILD.end;
        if (!isBreakdown && tick % 4 === 0)  this._playKick(time);
        if (isBuild)      { if (tick % 2 === 0)  this._playSnare(time); }
        else if (!isBreakdown) { if (tick % 8 === 4) this._playSnare(time); }
        if (!isBreakdown && tick % 2 === 0)  this._playHihat(time, tick % 8 === 2);
    }

    _playBass(time, tick, bar) {
        const rootIdx = [0, 5, 3, 4][bar % 4];
        let cutoff = 300;
        if (bar >= SECTIONS.CHORUS.start    && bar < SECTIONS.CHORUS.end)    cutoff = 800;
        if (bar >= SECTIONS.BREAKDOWN.start && bar < SECTIONS.BREAKDOWN.end) cutoff = 100;
        if (bar >= SECTIONS.OUTRO.start)                                      cutoff = 1500;
        if (tick % 4 !== 0) this._playSuperSawBass(this.getFreq('mainTheme', rootIdx), time, this.noteLength, cutoff);
    }

    _playLead(time, tick, bar) {
        if ((bar >= SECTIONS.CHORUS.start && bar < SECTIONS.CHORUS.end) || bar >= SECTIONS.OUTRO.start) {
            const melody   = [7, -1, 7, 8, 7, 4, 2, 0, -1, 2, 4, 2, 0, -1, -1, -1];
            const noteVal  = melody[tick];
            if (noteVal !== -1) {
                const freq = this.getFreq('mainTheme', noteVal + (bar >= SECTIONS.OUTRO.start ? 7 : 0));
                this._playFMLead(freq, time, this.noteLength * 2);
            }
            return;
        }
        if (bar >= SECTIONS.BREAKDOWN.start && bar < SECTIONS.BREAKDOWN.end && tick % 4 === 0) {
            const freq = this.getFreq('mainTheme', [0, 2, 4, 7][Math.floor(Math.random() * 4)] + 7);
            this._playFMLead(freq, time + Math.random() * 0.05, 0.5, 0.1);
        }
    }

    _playKick(time) {
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.connect(gain); gain.connect(this._master);
        osc.start(time); osc.stop(time + 0.5);
        this._sidechainBus.gain.cancelScheduledValues(time);
        this._sidechainBus.gain.setValueAtTime(0.3, time);
        this._sidechainBus.gain.exponentialRampToValueAtTime(1.0, time + 0.15);
        this.onBeat(time, 'kick');
        osc.onended = makeCleanup(osc, gain);
    }

    _playSnare(time) {
        const src = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
        src.buffer = this._noiseBuffer; filter.type = 'bandpass'; filter.frequency.value = 1500;
        src.connect(filter); filter.connect(gain); gain.connect(this._sidechainBus);
        gain.gain.setValueAtTime(0.7, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        src.start(time); src.stop(time + 0.2);
        this.onBeat(time, 'snare');
        src.onended = makeCleanup(src, filter, gain);
    }

    _playHihat(time, open = false) {
        const src = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
        src.buffer = this._noiseBuffer; filter.type = 'highpass'; filter.frequency.value = 8000;
        const dur = open ? 0.3 : 0.05;
        src.connect(filter); filter.connect(gain); gain.connect(this._sidechainBus);
        gain.gain.setValueAtTime(open ? 0.2 : 0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
        src.start(time); src.stop(time + dur);
        src.onended = makeCleanup(src, filter, gain);
    }

    _playSuperSawBass(freq, time, dur, cutoff = 300) {
        const osc1 = this.ctx.createOscillator(), osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
        osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
        osc1.frequency.value = freq; osc2.frequency.value = freq * 1.01;
        filter.type = 'lowpass'; filter.Q.value = 3;
        filter.frequency.setValueAtTime(cutoff, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.linearRampToValueAtTime(0.3, time + dur - 0.05);
        gain.gain.linearRampToValueAtTime(0, time + dur);
        osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(this._sidechainBus);
        osc1.start(time); osc2.start(time);
        osc1.stop(time + dur + 0.1); osc2.stop(time + dur + 0.1);
        this.onBeat(time, 'bass');
        const cleanup = makeCleanup(osc1, osc2, filter, gain);
        osc1.onended = cleanup; osc2.onended = cleanup;
    }

    _playFMLead(freq, time, dur, vol = 0.15) {
        const carrier = this.ctx.createOscillator(), modulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain(), gain = this.ctx.createGain();
        const delay = this.ctx.createDelay(), dGain = this.ctx.createGain();
        carrier.frequency.value = freq; modulator.frequency.value = freq * 2;
        modGain.gain.value = 500; delay.delayTime.value = 0.25; dGain.gain.value = 0.4;
        modulator.connect(modGain); modGain.connect(carrier.frequency);
        carrier.connect(gain);
        gain.connect(this._sidechainBus);
        gain.connect(delay); delay.connect(dGain); dGain.connect(this._sidechainBus);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.05);
        gain.gain.setValueAtTime(vol, time + dur - 0.1);
        gain.gain.linearRampToValueAtTime(0, time + dur);
        carrier.start(time); modulator.start(time);
        carrier.stop(time + dur + 0.5); modulator.stop(time + dur + 0.5);
        this.onBeat(time, 'lead');
        carrier.onended = makeCleanup(carrier, modulator, modGain, gain, delay, dGain);
    }

    _playSynth(freq, time, dur, type = 'triangle') {
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.1);
        gain.gain.linearRampToValueAtTime(0, time + dur);
        osc.connect(gain); gain.connect(this._reverb);
        osc.start(time); osc.stop(time + dur + 0.1);
        osc.onended = makeCleanup(osc, gain);
    }
}
