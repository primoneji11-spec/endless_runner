/* ===================================================
   EnvironmentManager.js — Parallax backgrounds, 
   day/night cycle, and physics modifiers
   =================================================== */
class EnvironmentManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.envType = 'desert';

        // Parallax scroll offsets
        this.layers = [0, 0, 0]; // far, mid, near

        // Day/Night cycle
        this.timeOfDay = 0;     // 0–1
        this.cycleSpeed = 0.0003;

        // Stars cache for space env
        this.stars = [];
        for (let i = 0; i < 120; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                r: Math.random() * 1.8 + 0.5,
                twinkle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.5 + 0.1
            });
        }

        // Physics modifiers per environment
        this.modifiers = {
            desert: { gravityScale: 1.0, jumpScale: 1.0 },
            forest: { gravityScale: 1.0, jumpScale: 1.0 },
            space:  { gravityScale: 0.5, jumpScale: 0.75 }
        };
    }

    setEnvironment(type) {
        this.envType = type;
        this.timeOfDay = 0;
        this.layers = [0, 0, 0];
    }

    getModifiers() {
        return this.modifiers[this.envType] || this.modifiers.desert;
    }

    getGroundColor() {
        switch (this.envType) {
            case 'desert': return '#c2a04e';
            case 'forest': return '#1a5c32';
            case 'space':  return '#2a2e3a';
        }
    }

    update(speed) {
        this.layers[0] -= speed * 0.3;
        this.layers[1] -= speed * 0.6;
        this.layers[2] -= speed * 1.0;

        this.timeOfDay = (this.timeOfDay + this.cycleSpeed * speed) % 1;
    }

    draw(groundY) {
        const { ctx, canvas: c } = this;
        const w = c.width, h = c.height;

        // — SKY GRADIENT —
        const grad = ctx.createLinearGradient(0, 0, 0, groundY);
        const colors = this._skyColors();
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, groundY);

        // — ENVIRONMENT LAYERS —
        switch (this.envType) {
            case 'desert': this._drawDesert(w, h, groundY); break;
            case 'forest': this._drawForest(w, h, groundY); break;
            case 'space':  this._drawSpace(w, h, groundY);  break;
        }

        // — GROUND —
        ctx.fillStyle = this.getGroundColor();
        ctx.fillRect(0, groundY, w, h - groundY);

        // Ground top line glow
        ctx.strokeStyle = this.envType === 'space' ? 'rgba(0,240,255,0.3)' : 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.stroke();

        // Ground grid for Space
        if (this.envType === 'space') {
            ctx.strokeStyle = 'rgba(0,240,255,0.06)';
            ctx.lineWidth = 1;
            const gridSize = 60;
            const offsetX = this.layers[2] % gridSize;
            for (let gx = offsetX; gx < w; gx += gridSize) {
                ctx.beginPath(); ctx.moveTo(gx, groundY); ctx.lineTo(gx, h); ctx.stroke();
            }
            for (let gy = groundY; gy < h; gy += gridSize / 2) {
                ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
            }
        }

        // Day/night overlay
        if (this.envType !== 'space') {
            const nightAlpha = this.timeOfDay > 0.5
                ? Math.sin((this.timeOfDay - 0.5) * Math.PI) * 0.35
                : 0;
            if (nightAlpha > 0) {
                ctx.fillStyle = `rgba(10,14,30,${nightAlpha})`;
                ctx.fillRect(0, 0, w, h);
            }
        }
    }

    _skyColors() {
        if (this.envType === 'space') return ['#020408', '#0a0e17'];

        const isNight = this.timeOfDay > 0.5;
        if (this.envType === 'desert') {
            return isNight ? ['#1a1040', '#2d1b4e'] : ['#ff9a56', '#ffd080'];
        }
        // forest
        return isNight ? ['#0a1628', '#162040'] : ['#4ade80', '#a7f3d0'];
    }

    // =========== DESERT ===========
    _drawDesert(w, h, gy) {
        const ctx = this.ctx;

        // Far dunes
        ctx.fillStyle = 'rgba(194,160,78,0.25)';
        this._drawWave(ctx, w, gy, this.layers[0], 250, 80, 0.003);

        // Synthwave sun
        const sunY = gy - 120 + Math.sin(this.timeOfDay * Math.PI * 2) * 30;
        const sunGrad = ctx.createRadialGradient(w * 0.7, sunY, 10, w * 0.7, sunY, 70);
        sunGrad.addColorStop(0, 'rgba(255,200,60,0.9)');
        sunGrad.addColorStop(0.5, 'rgba(255,100,50,0.4)');
        sunGrad.addColorStop(1, 'rgba(255,50,50,0)');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(w * 0.7 - 80, sunY - 80, 160, 160);

        // Near dunes
        ctx.fillStyle = 'rgba(194,160,78,0.4)';
        this._drawWave(ctx, w, gy, this.layers[1], 180, 50, 0.005);
    }

    // =========== FOREST ===========
    _drawForest(w, h, gy) {
        const ctx = this.ctx;

        // Far trees
        this._drawTreeLine(ctx, w, gy, this.layers[0], '#064e3b', 0.5, 100);

        // Mid trees
        this._drawTreeLine(ctx, w, gy, this.layers[1], '#065f46', 0.7, 70);

        // Near bushes
        ctx.fillStyle = 'rgba(16,185,129,0.2)';
        this._drawWave(ctx, w, gy, this.layers[2], 120, 30, 0.008);
    }

    // =========== SPACE ===========
    _drawSpace(w, h, gy) {
        const ctx = this.ctx;

        // Stars
        const time = performance.now() * 0.001;
        for (const s of this.stars) {
            const sx = ((s.x * w + this.layers[0] * s.speed) % (w + 20)) - 10;
            const sy = s.y * gy;
            const alpha = 0.3 + Math.sin(time * 2 + s.twinkle) * 0.3 + 0.3;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Distant planet
        const px = ((w * 0.8 + this.layers[0] * 0.1) % (w + 200)) - 100;
        const pGrad = ctx.createRadialGradient(px, gy * 0.3, 5, px, gy * 0.3, 35);
        pGrad.addColorStop(0, 'rgba(100,60,180,0.6)');
        pGrad.addColorStop(1, 'rgba(100,60,180,0)');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, gy * 0.3, 30, 0, Math.PI * 2);
        ctx.fill();
        // Ring
        ctx.strokeStyle = 'rgba(180,140,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(px, gy * 0.3, 50, 12, -0.3, 0, Math.PI * 2);
        ctx.stroke();
    }

    // =========== HELPERS ===========
    _drawWave(ctx, w, gy, offset, period, amp, freq) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        for (let x = 0; x <= w; x += 4) {
            const y = gy - amp * Math.sin((x + offset) * freq) - amp * 0.5;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(w, gy);
        ctx.closePath();
        ctx.fill();
    }

    _drawTreeLine(ctx, w, gy, offset, color, scale, spacing) {
        ctx.fillStyle = color;
        const treeW = 30 * scale;
        const treeH = 120 * scale;
        const crownR = 35 * scale;
        for (let i = -1; i < w / spacing + 2; i++) {
            const tx = (i * spacing + offset) % (w + spacing * 2) - spacing;
            // Trunk
            ctx.fillRect(tx - treeW / 4, gy - treeH, treeW / 2, treeH);
            // Crown
            ctx.beginPath();
            ctx.arc(tx, gy - treeH - crownR * 0.3, crownR, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
