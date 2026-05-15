/* ===================================================
   ObstacleManager.js — Spawning, drawing, collision
   =================================================== */
class ObstacleManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.obstacles = [];
        this.spawnTimer = 80;
        this.envType = 'desert';
        this.minGap = 55; // Minimum frames between spawns
    }

    setEnvironment(type) {
        this.envType = type;
        this.obstacles = [];
        this.spawnTimer = 80;
    }

    update(speed, groundY) {
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
            this._spawn(groundY);
            this.spawnTimer = Math.max(this.minGap, (Math.random() * 70 + 50) / Math.max(0.8, speed * 0.7));
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            o.x -= 6 * speed;
            // Animate laser
            if (o.type === 'laser') o.animTimer = (o.animTimer || 0) + 0.15;
            if (o.x + o.width < -20) this.obstacles.splice(i, 1);
        }
    }

    _spawn(groundY) {
        const type = this._randomType();
        const o = { type, x: this.canvas.width + 20, animTimer: 0 };

        switch (type) {
            case 'cactus':
                o.width = 28 + Math.random() * 12;
                o.height = 40 + Math.random() * 25;
                o.y = groundY - o.height;
                break;
            case 'bird':
                o.width = 36;
                o.height = 26;
                o.y = groundY - 65 - Math.random() * 20;
                break;
            case 'snake':
                o.width = 50;
                o.height = 18;
                o.y = groundY - o.height;
                break;
            case 'vine':
                o.width = 14;
                o.height = groundY - 45;
                o.y = 0;
                break;
            case 'asteroid':
                o.width = 32 + Math.random() * 16;
                o.height = o.width;
                o.y = groundY - o.height - Math.random() * 10;
                break;
            case 'laser':
                o.width = 60;
                o.height = 8;
                o.y = groundY - 35 - Math.random() * 40;
                break;
        }

        this.obstacles.push(o);
    }

    _randomType() {
        const r = Math.random();
        switch (this.envType) {
            case 'desert': return r > 0.3 ? 'cactus' : 'bird';
            case 'forest': return r > 0.4 ? 'snake' : 'vine';
            case 'space':  return r > 0.45 ? 'asteroid' : 'laser';
        }
        return 'cactus';
    }

    draw() {
        const ctx = this.ctx;
        for (const o of this.obstacles) {
            ctx.save();
            switch (o.type) {
                case 'cactus':   this._drawCactus(ctx, o); break;
                case 'bird':     this._drawBird(ctx, o); break;
                case 'snake':    this._drawSnake(ctx, o); break;
                case 'vine':     this._drawVine(ctx, o); break;
                case 'asteroid': this._drawAsteroid(ctx, o); break;
                case 'laser':    this._drawLaser(ctx, o); break;
            }
            ctx.restore();
        }
    }

    _drawCactus(ctx, o) {
        // Trunk
        ctx.fillStyle = '#22c55e';
        this._rr(ctx, o.x, o.y, o.width, o.height, 4);
        // Arms
        ctx.fillStyle = '#16a34a';
        const armW = 10, armH = 18;
        ctx.fillRect(o.x - armW, o.y + 10, armW, armH);
        ctx.fillRect(o.x - armW, o.y + 10, armW, 6); // top cap
        ctx.fillRect(o.x + o.width, o.y + 22, armW, armH);
        ctx.fillRect(o.x + o.width, o.y + 22, armW, 6);
        // Spines (dots)
        ctx.fillStyle = '#bbf7d0';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(o.x + 6 + i * 6, o.y + 8 + i * 8, 2, 2);
        }
    }

    _drawBird(ctx, o) {
        const cx = o.x + o.width / 2;
        const cy = o.y + o.height / 2;
        // Body
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(cx, cy, o.width / 2, o.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wing (animated)
        const wingY = Math.sin(performance.now() * 0.01) * 8;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy);
        ctx.lineTo(cx - 2, cy - 14 + wingY);
        ctx.lineTo(cx + 8, cy);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx + 10, cy - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx + 11, cy - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(cx + o.width / 2, cy);
        ctx.lineTo(cx + o.width / 2 + 8, cy + 2);
        ctx.lineTo(cx + o.width / 2, cy + 5);
        ctx.closePath();
        ctx.fill();
    }

    _drawSnake(ctx, o) {
        // Body wave
        ctx.strokeStyle = '#84cc16';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i <= o.width; i += 2) {
            const sy = o.y + o.height / 2 + Math.sin(i * 0.2) * 5;
            if (i === 0) ctx.moveTo(o.x + i, sy);
            else ctx.lineTo(o.x + i, sy);
        }
        ctx.stroke();
        // Head
        ctx.fillStyle = '#65a30d';
        ctx.beginPath();
        ctx.arc(o.x + 4, o.y + o.height / 2, 7, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(o.x + 2, o.y + o.height / 2 - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        // Tongue
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(o.x - 2, o.y + o.height / 2);
        ctx.lineTo(o.x - 10, o.y + o.height / 2 - 3);
        ctx.moveTo(o.x - 2, o.y + o.height / 2);
        ctx.lineTo(o.x - 10, o.y + o.height / 2 + 3);
        ctx.stroke();
    }

    _drawVine(ctx, o) {
        // Main vine stem
        ctx.strokeStyle = '#166534';
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let vy = 0; vy < o.height; vy += 3) {
            const vx = o.x + Math.sin(vy * 0.03) * 8;
            if (vy === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
        }
        ctx.stroke();

        // Leaves at bottom
        ctx.fillStyle = '#22c55e';
        const leafY = o.height;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.ellipse(o.x + i * 10, leafY, 10, 6, i * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Slight glow
        ctx.fillStyle = 'rgba(34,197,94,0.15)';
        ctx.beginPath();
        ctx.arc(o.x, leafY, 20, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawAsteroid(ctx, o) {
        const cx = o.x + o.width / 2;
        const cy = o.y + o.height / 2;
        const r = o.width / 2;

        // Glow
        ctx.fillStyle = 'rgba(120,113,108,0.15)';
        ctx.beginPath();
        ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        // Irregular shape
        const pts = 8;
        for (let i = 0; i < pts; i++) {
            const angle = (i / pts) * Math.PI * 2;
            const rr = r * (0.8 + ((i * 7 + 3) % 5) * 0.06);
            const px = cx + Math.cos(angle) * rr;
            const py = cy + Math.sin(angle) * rr;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Craters
        ctx.fillStyle = '#57534e';
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 5, cy + 4, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawLaser(ctx, o) {
        const t = o.animTimer || 0;
        const alpha = 0.5 + Math.sin(t * 3) * 0.3;

        // Warning line (thin)
        ctx.strokeStyle = `rgba(255,0,85,0.15)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y + o.height / 2);
        ctx.lineTo(o.x + o.width, o.y + o.height / 2);
        ctx.stroke();

        // Laser beam
        ctx.fillStyle = `rgba(255,0,85,${alpha})`;
        this._rr(ctx, o.x, o.y, o.width, o.height, 3);

        // Core (bright)
        ctx.fillStyle = `rgba(255,150,180,${alpha})`;
        ctx.fillRect(o.x + 2, o.y + 2, o.width - 4, o.height - 4);

        // Glow
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(255,0,85,0.01)';
        ctx.fillRect(o.x, o.y, o.width, o.height);
        ctx.shadowBlur = 0;

        // End nodes
        ctx.fillStyle = '#ff4488';
        ctx.beginPath();
        ctx.arc(o.x, o.y + o.height / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(o.x + o.width, o.y + o.height / 2, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    _rr(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    }

    checkCollision(pBounds) {
        for (const o of this.obstacles) {
            let ob;
            if (o.type === 'vine') {
                ob = { x: o.x - 6, y: 0, width: 12, height: o.height };
            } else {
                ob = { x: o.x + 3, y: o.y + 3, width: o.width - 6, height: o.height - 6 };
            }
            if (pBounds.x < ob.x + ob.width &&
                pBounds.x + pBounds.width > ob.x &&
                pBounds.y < ob.y + ob.height &&
                pBounds.y + pBounds.height > ob.y) {
                return true;
            }
        }
        return false;
    }
}
