/* ===================================================
   ParticleSystem.js — Running dust & collision FX
   =================================================== */
class ParticleSystem {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
        this.particles = [];
    }

    emit(x, y, count, color = '#00f0ff', opts = {}) {
        const { spread = 4, speedX = 0, speedY = -2, sizeMin = 1.5, sizeMax = 4, lifeMin = 0.4, lifeMax = 1 } = opts;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * spread + speedX,
                vy: (Math.random() - 0.8) * spread + speedY,
                life: 1,
                decay: 1 / (Math.random() * (lifeMax - lifeMin) * 60 + lifeMin * 60),
                size: Math.random() * (sizeMax - sizeMin) + sizeMin,
                color
            });
        }
    }

    update(worldSpeed) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx - worldSpeed * 1.5;
            p.y += p.vy;
            p.vy += 0.05; // tiny gravity on particles
            p.life -= p.decay;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life * 0.8);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    clear() {
        this.particles = [];
    }
}
