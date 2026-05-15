/* ===================================================
   EnvironmentManager.js — Parallax backgrounds, 
   day/night cycle, phase transitions, and physics modifiers
   Now includes: Cyber City & Volcano environments
   =================================================== */
class EnvironmentManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.envType = 'desert';
        this.currentPhase = 'desert';
        this.layers = [0, 0, 0];
        this.timeOfDay = 0;
        this.cycleSpeed = 0.0003;
        this.transitionAlpha = 0;
        this.transitioning = false;
        this.nextPhase = null;

        this.stars = [];
        for (let i = 0; i < 120; i++) {
            this.stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + 0.5, twinkle: Math.random() * Math.PI * 2, speed: Math.random() * 0.5 + 0.1 });
        }
        // Cyber city buildings cache
        this.buildings = [];
        for (let i = 0; i < 20; i++) {
            this.buildings.push({ w: 30 + Math.random() * 50, h: 80 + Math.random() * 120, windows: Math.floor(Math.random() * 6) + 2, neonColor: ['#ff0055','#00f0ff','#c840ff','#00ff88','#ff8800'][Math.floor(Math.random()*5)] });
        }
        // Volcano lava blobs
        this.lavaBlobs = [];
        for (let i = 0; i < 8; i++) {
            this.lavaBlobs.push({ x: Math.random(), size: 3 + Math.random() * 5, speed: 0.5 + Math.random(), phase: Math.random() * Math.PI * 2 });
        }

        this.modifiers = {
            desert:    { gravityScale: 1.0, jumpScale: 1.0 },
            forest:    { gravityScale: 1.0, jumpScale: 1.0 },
            space:     { gravityScale: 0.5, jumpScale: 0.75 },
            cybercity: { gravityScale: 1.0, jumpScale: 1.05 },
            volcano:   { gravityScale: 1.1, jumpScale: 0.95 }
        };
    }

    setEnvironment(type) {
        this.envType = type;
        this.currentPhase = type;
        this.timeOfDay = 0;
        this.layers = [0, 0, 0];
        this.transitioning = false;
        this.transitionAlpha = 0;
    }

    transitionTo(newPhase) {
        if (this.currentPhase === newPhase || this.transitioning) return;
        this.transitioning = true;
        this.nextPhase = newPhase;
        this.transitionAlpha = 0;
    }

    getPhaseForScore(score) {
        if (score >= 1000) return 'volcano';
        if (score >= 500) return 'cybercity';
        return this.envType;
    }

    getModifiers() { return this.modifiers[this.currentPhase] || this.modifiers.desert; }
    getGroundColor() {
        switch (this.currentPhase) {
            case 'desert': return '#c2a04e'; case 'forest': return '#1a5c32';
            case 'space': return '#2a2e3a'; case 'cybercity': return '#1a1030';
            case 'volcano': return '#3a1a0a'; default: return '#c2a04e';
        }
    }

    update(speed) {
        this.layers[0] -= speed * 0.3;
        this.layers[1] -= speed * 0.6;
        this.layers[2] -= speed * 1.0;
        this.timeOfDay = (this.timeOfDay + this.cycleSpeed * speed) % 1;

        if (this.transitioning) {
            this.transitionAlpha += 0.02;
            if (this.transitionAlpha >= 1) {
                this.currentPhase = this.nextPhase;
                this.transitioning = false;
                this.transitionAlpha = 0;
                this.nextPhase = null;
            }
        }
    }

    draw(groundY) {
        const { ctx, canvas: c } = this;
        const w = c.width, h = c.height;

        if (this.transitioning && this.transitionAlpha > 0.5) {
            this._drawPhase(this.nextPhase, w, h, groundY);
        } else {
            this._drawPhase(this.currentPhase, w, h, groundY);
        }

        if (this.transitioning) {
            const flash = this.transitionAlpha < 0.5 ? this.transitionAlpha * 2 : (1 - this.transitionAlpha) * 2;
            ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.3})`;
            ctx.fillRect(0, 0, w, h);
        }
    }

    _drawPhase(phase, w, h, gy) {
        const ctx = this.ctx;
        const grad = ctx.createLinearGradient(0, 0, 0, gy);
        const colors = this._skyColorsForPhase(phase);
        grad.addColorStop(0, colors[0]); grad.addColorStop(1, colors[1]);
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, gy);

        switch (phase) {
            case 'desert': this._drawDesert(w, h, gy); break;
            case 'forest': this._drawForest(w, h, gy); break;
            case 'space': this._drawSpace(w, h, gy); break;
            case 'cybercity': this._drawCyberCity(w, h, gy); break;
            case 'volcano': this._drawVolcano(w, h, gy); break;
        }

        const gc = this._groundColorForPhase(phase);
        ctx.fillStyle = gc; ctx.fillRect(0, gy, w, h - gy);

        if (phase === 'space' || phase === 'cybercity') {
            ctx.strokeStyle = phase === 'cybercity' ? 'rgba(200,64,255,0.3)' : 'rgba(0,240,255,0.3)';
        } else if (phase === 'volcano') {
            ctx.strokeStyle = 'rgba(255,100,0,0.4)';
        } else {
            ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        }
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();

        if (phase === 'space') { this._drawSpaceGrid(w, h, gy); }
        if (phase === 'cybercity') { this._drawCyberGrid(w, h, gy); }
        if (phase === 'volcano') { this._drawLavaGround(w, h, gy); }

        if (phase !== 'space' && phase !== 'cybercity') {
            const nightAlpha = this.timeOfDay > 0.5 ? Math.sin((this.timeOfDay - 0.5) * Math.PI) * 0.35 : 0;
            if (nightAlpha > 0) { ctx.fillStyle = `rgba(10,14,30,${nightAlpha})`; ctx.fillRect(0, 0, w, h); }
        }
    }

    _groundColorForPhase(p) {
        switch(p) { case 'desert': return '#c2a04e'; case 'forest': return '#1a5c32'; case 'space': return '#2a2e3a'; case 'cybercity': return '#1a1030'; case 'volcano': return '#3a1a0a'; default: return '#c2a04e'; }
    }

    _skyColorsForPhase(phase) {
        if (phase === 'space') return ['#020408', '#0a0e17'];
        if (phase === 'cybercity') return ['#0a0520', '#1a0a40'];
        if (phase === 'volcano') return ['#1a0500', '#4a1500'];
        const isNight = this.timeOfDay > 0.5;
        if (phase === 'desert') return isNight ? ['#1a1040', '#2d1b4e'] : ['#ff9a56', '#ffd080'];
        return isNight ? ['#0a1628', '#162040'] : ['#4ade80', '#a7f3d0'];
    }

    // =========== DESERT ===========
    _drawDesert(w, h, gy) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(194,160,78,0.25)'; this._drawWave(ctx, w, gy, this.layers[0], 250, 80, 0.003);
        const sunY = gy - 120 + Math.sin(this.timeOfDay * Math.PI * 2) * 30;
        const sunGrad = ctx.createRadialGradient(w * 0.7, sunY, 10, w * 0.7, sunY, 70);
        sunGrad.addColorStop(0, 'rgba(255,200,60,0.9)'); sunGrad.addColorStop(0.5, 'rgba(255,100,50,0.4)'); sunGrad.addColorStop(1, 'rgba(255,50,50,0)');
        ctx.fillStyle = sunGrad; ctx.fillRect(w * 0.7 - 80, sunY - 80, 160, 160);
        ctx.fillStyle = 'rgba(194,160,78,0.4)'; this._drawWave(ctx, w, gy, this.layers[1], 180, 50, 0.005);
    }

    // =========== FOREST ===========
    _drawForest(w, h, gy) {
        const ctx = this.ctx;
        this._drawTreeLine(ctx, w, gy, this.layers[0], '#064e3b', 0.5, 100);
        this._drawTreeLine(ctx, w, gy, this.layers[1], '#065f46', 0.7, 70);
        ctx.fillStyle = 'rgba(16,185,129,0.2)'; this._drawWave(ctx, w, gy, this.layers[2], 120, 30, 0.008);
    }

    // =========== SPACE ===========
    _drawSpace(w, h, gy) {
        const ctx = this.ctx; const time = performance.now() * 0.001;
        for (const s of this.stars) {
            const sx = ((s.x * w + this.layers[0] * s.speed) % (w + 20)) - 10;
            const alpha = 0.3 + Math.sin(time * 2 + s.twinkle) * 0.3 + 0.3;
            ctx.globalAlpha = alpha; ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(sx, s.y * gy, s.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        const px = ((w * 0.8 + this.layers[0] * 0.1) % (w + 200)) - 100;
        const pGrad = ctx.createRadialGradient(px, gy * 0.3, 5, px, gy * 0.3, 35);
        pGrad.addColorStop(0, 'rgba(100,60,180,0.6)'); pGrad.addColorStop(1, 'rgba(100,60,180,0)');
        ctx.fillStyle = pGrad; ctx.beginPath(); ctx.arc(px, gy * 0.3, 30, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(180,140,255,0.3)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(px, gy * 0.3, 50, 12, -0.3, 0, Math.PI * 2); ctx.stroke();
    }

    _drawSpaceGrid(w, h, gy) {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(0,240,255,0.06)'; ctx.lineWidth = 1;
        const gs = 60, ox = this.layers[2] % gs;
        for (let gx = ox; gx < w; gx += gs) { ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, h); ctx.stroke(); }
        for (let gy2 = gy; gy2 < h; gy2 += gs / 2) { ctx.beginPath(); ctx.moveTo(0, gy2); ctx.lineTo(w, gy2); ctx.stroke(); }
    }

    // =========== CYBER CITY ===========
    _drawCyberCity(w, h, gy) {
        const ctx = this.ctx; const time = performance.now() * 0.001;
        // Stars
        for (let i = 0; i < 40; i++) {
            const s = this.stars[i];
            const sx = ((s.x * w + this.layers[0] * s.speed * 0.3) % (w + 20)) - 10;
            ctx.globalAlpha = 0.2 + Math.sin(time + s.twinkle) * 0.2;
            ctx.fillStyle = '#c840ff'; ctx.beginPath(); ctx.arc(sx, s.y * gy * 0.5, s.r * 0.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Far buildings
        const spacing = 70;
        for (let i = 0; i < this.buildings.length; i++) {
            const b = this.buildings[i];
            const bx = ((i * spacing + this.layers[0] * 0.5) % (w + spacing * 2)) - spacing;
            const by = gy - b.h * 0.6;
            ctx.fillStyle = '#0a0520';
            ctx.fillRect(bx, by, b.w * 0.7, gy - by);
            // Windows
            for (let wy = 0; wy < b.windows; wy++) {
                const wAlpha = 0.3 + Math.sin(time * 2 + i + wy) * 0.3;
                ctx.fillStyle = `rgba(200,64,255,${wAlpha})`;
                ctx.fillRect(bx + 5, by + 8 + wy * 14, 4, 3);
                ctx.fillRect(bx + 14, by + 8 + wy * 14, 4, 3);
            }
        }
        // Near buildings
        for (let i = 0; i < 12; i++) {
            const b = this.buildings[i % this.buildings.length];
            const bx = ((i * 55 + this.layers[1]) % (w + 200)) - 100;
            const bh = b.h * 0.9;
            ctx.fillStyle = '#120830';
            ctx.fillRect(bx, gy - bh, b.w, bh);
            // Neon sign
            ctx.fillStyle = b.neonColor;
            ctx.shadowColor = b.neonColor; ctx.shadowBlur = 8;
            ctx.fillRect(bx + 3, gy - bh + 5, b.w - 6, 3);
            ctx.shadowBlur = 0;
            // Windows
            for (let wy = 0; wy < b.windows; wy++) {
                const wOn = Math.sin(time + i * 3 + wy * 2) > 0;
                ctx.fillStyle = wOn ? 'rgba(0,240,255,0.5)' : 'rgba(0,240,255,0.08)';
                for (let wx = 0; wx < 3; wx++) {
                    ctx.fillRect(bx + 6 + wx * 12, gy - bh + 16 + wy * 18, 6, 8);
                }
            }
        }
        // Holographic scan line
        const scanY = (time * 40) % gy;
        ctx.fillStyle = 'rgba(200,64,255,0.04)';
        ctx.fillRect(0, scanY, w, 2);
    }

    _drawCyberGrid(w, h, gy) {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(200,64,255,0.06)'; ctx.lineWidth = 1;
        const gs = 50, ox = this.layers[2] % gs;
        for (let gx = ox; gx < w; gx += gs) { ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, h); ctx.stroke(); }
        for (let gy2 = gy; gy2 < h; gy2 += gs / 2) { ctx.beginPath(); ctx.moveTo(0, gy2); ctx.lineTo(w, gy2); ctx.stroke(); }
    }

    // =========== VOLCANO ===========
    _drawVolcano(w, h, gy) {
        const ctx = this.ctx; const time = performance.now() * 0.001;
        // Volcanic mountain silhouette (far)
        ctx.fillStyle = '#2a0800';
        ctx.beginPath(); ctx.moveTo(0, gy);
        ctx.lineTo(w * 0.15, gy - 60); ctx.lineTo(w * 0.35, gy - 140);
        ctx.lineTo(w * 0.42, gy - 130); ctx.lineTo(w * 0.5, gy - 160);
        ctx.lineTo(w * 0.58, gy - 130); ctx.lineTo(w * 0.65, gy - 140);
        ctx.lineTo(w * 0.85, gy - 60); ctx.lineTo(w, gy);
        ctx.closePath(); ctx.fill();
        // Lava glow from crater
        const lavaGlow = 0.3 + Math.sin(time * 1.5) * 0.15;
        const lgr = ctx.createRadialGradient(w * 0.5, gy - 160, 5, w * 0.5, gy - 140, 80);
        lgr.addColorStop(0, `rgba(255,100,0,${lavaGlow})`); lgr.addColorStop(0.5, `rgba(255,50,0,${lavaGlow * 0.5})`); lgr.addColorStop(1, 'rgba(255,30,0,0)');
        ctx.fillStyle = lgr; ctx.fillRect(w * 0.3, gy - 220, w * 0.4, 120);
        // Eruption particles
        for (const lb of this.lavaBlobs) {
            const lx = w * 0.45 + (lb.x - 0.5) * 60;
            const ly = gy - 160 - Math.abs(Math.sin(time * lb.speed + lb.phase)) * 40;
            const la = 0.5 + Math.sin(time * 2 + lb.phase) * 0.3;
            ctx.fillStyle = `rgba(255,${Math.floor(80 + Math.random() * 80)},0,${la})`;
            ctx.beginPath(); ctx.arc(lx, ly, lb.size, 0, Math.PI * 2); ctx.fill();
        }
        // Near rocky terrain
        ctx.fillStyle = '#1a0800';
        this._drawWave(ctx, w, gy, this.layers[1], 100, 25, 0.007);
        // Ash particles
        ctx.fillStyle = 'rgba(100,80,60,0.15)';
        for (let i = 0; i < 15; i++) {
            const ax = ((i * 37 + this.layers[0] * 0.3 + time * 10) % w);
            const ay = (Math.sin(time * 0.5 + i * 1.7) * 0.5 + 0.5) * gy;
            ctx.beginPath(); ctx.arc(ax, ay, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        // Heat haze overlay
        ctx.fillStyle = `rgba(255,50,0,${0.02 + Math.sin(time) * 0.01})`;
        ctx.fillRect(0, 0, w, gy);
    }

    _drawLavaGround(w, h, gy) {
        const ctx = this.ctx; const time = performance.now() * 0.001;
        // Lava cracks
        ctx.strokeStyle = `rgba(255,100,0,${0.2 + Math.sin(time * 2) * 0.1})`;
        ctx.lineWidth = 2;
        const gs = 40, ox = this.layers[2] % gs;
        for (let gx = ox; gx < w; gx += gs) {
            ctx.beginPath();
            ctx.moveTo(gx, gy + 5);
            ctx.lineTo(gx + Math.sin(gx * 0.1) * 10, h);
            ctx.stroke();
        }
        // Glow along ground line
        const glowGrad = ctx.createLinearGradient(0, gy, 0, gy + 15);
        glowGrad.addColorStop(0, `rgba(255,80,0,${0.15 + Math.sin(time * 3) * 0.05})`);
        glowGrad.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = glowGrad; ctx.fillRect(0, gy, w, 15);
    }

    // =========== HELPERS ===========
    _drawWave(ctx, w, gy, offset, period, amp, freq) {
        ctx.beginPath(); ctx.moveTo(0, gy);
        for (let x = 0; x <= w; x += 4) { ctx.lineTo(x, gy - amp * Math.sin((x + offset) * freq) - amp * 0.5); }
        ctx.lineTo(w, gy); ctx.closePath(); ctx.fill();
    }

    _drawTreeLine(ctx, w, gy, offset, color, scale, spacing) {
        ctx.fillStyle = color;
        const treeW = 30 * scale, treeH = 120 * scale, crownR = 35 * scale;
        for (let i = -1; i < w / spacing + 2; i++) {
            const tx = (i * spacing + offset) % (w + spacing * 2) - spacing;
            ctx.fillRect(tx - treeW / 4, gy - treeH, treeW / 2, treeH);
            ctx.beginPath(); ctx.arc(tx, gy - treeH - crownR * 0.3, crownR, 0, Math.PI * 2); ctx.fill();
        }
    }
}
