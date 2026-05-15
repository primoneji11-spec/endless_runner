/* ===================================================
   Audio.js — Web Audio API Sound Synthesizer
   =================================================== */
class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.bgMusicNode = null;
        this.bgMusicGain = null;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    play(type) {
        if (!this.enabled) return;
        this.init();
        this.resume();
        const t = this.ctx.currentTime;

        switch (type) {
            case 'jump': this._jump(t); break;
            case 'death': this._death(t); break;
            case 'score': this._score(t); break;
            case 'select': this._select(t); break;
        }
    }

    _jump(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    _death(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
    }

    _score(t) {
        [523, 659, 784].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + i * 0.08);
            gain.gain.setValueAtTime(0.06, t + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.15);
        });
    }

    _select(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
    }

    startBgMusic() {
        if (!this.enabled) return;
        this.init();
        this.resume();
        if (this.bgMusicNode) return;

        // Simple ambient drone
        const t = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.value = 55;
        osc2.type = 'sine';
        osc2.frequency.value = 82.5;

        gain.gain.value = 0.03;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);

        this.bgMusicNode = [osc1, osc2];
        this.bgMusicGain = gain;
    }

    stopBgMusic() {
        if (this.bgMusicNode) {
            this.bgMusicNode.forEach(o => { try { o.stop(); } catch(e){} });
            this.bgMusicNode = null;
        }
    }
}

// Singleton
window.audio = new AudioManager();
