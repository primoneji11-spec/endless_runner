/* ===================================================
   BossManager.js — Boss battle system with projectiles,
   health bar, and visual effects
   =================================================== */
class BossManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Boss state
        this.active = false;
        this.defeated = false;
        this.hp = 100;
        this.maxHp = 100;
        this.x = 0;
        this.y = 0;
        this.width = 80;
        this.height = 100;
        this.targetX = 0;

        // Animation
        this.animTimer = 0;
        this.hoverOffset = 0;
        this.eyeGlow = 0;
        this.shakeIntensity = 0;
        this.entranceProgress = 0; // 0 to 1

        // Projectiles
        this.projectiles = [];
        this.shootTimer = 0;
        this.shootInterval = 60; // frames between shots
        this.shootPattern = 0;

        // Boss flee timer (boss stays for ~20 seconds worth of frames)
        this.stayTimer = 0;
        this.maxStayTime = 1200; // ~20 seconds at 60fps

        // Damage flash
        this.flashTimer = 0;

        // Death particles
        this.deathParticles = [];
    }

    spawn(canvasWidth, groundY) {
        this.active = true;
        this.defeated = false;
        this.hp = this.maxHp;
        this.width = 80;
        this.height = 100;
        this.x = canvasWidth + 100;
        this.targetX = canvasWidth - 120;
        this.y = groundY - this.height - 30;
        this.projectiles = [];
        this.shootTimer = 90; // Small delay before first shot
        this.shootPattern = 0;
        this.stayTimer = 0;
        this.entranceProgress = 0;
        this.animTimer = 0;
        this.shakeIntensity = 0;
        this.flashTimer = 0;
        this.deathParticles = [];
    }

    update(groundY, playerBounds) {
        if (!this.active) return null; // null = no collision

        this.animTimer += 0.03;
        this.hoverOffset = Math.sin(this.animTimer * 2) * 8;
        this.eyeGlow = 0.6 + Math.sin(this.animTimer * 4) * 0.4;

        // Entrance slide
        if (this.entranceProgress < 1) {
            this.entranceProgress = Math.min(1, this.entranceProgress + 0.015);
            this.x = this.canvas.width + 100 - (this.canvas.width + 100 - this.targetX) * this._easeOutBack(this.entranceProgress);
            return null; // No collision during entrance
        }

        // Boss position with hover
        this.y = groundY - this.height - 30 + this.hoverOffset;

        // Damage shake decay
        if (this.shakeIntensity > 0) this.shakeIntensity *= 0.92;
        if (this.flashTimer > 0) this.flashTimer--;

        // Stay timer
        this.stayTimer++;
        if (this.stayTimer >= this.maxStayTime) {
            // Boss flees
            this.hp -= 2; // drain HP to end the fight
            if (this.hp <= 0) {
                this._die();
                return null;
            }
        }

        // HP drain over time (boss slowly weakens)
        if (this.stayTimer > 300) { // After 5 seconds
            this.hp -= 0.03;
            if (this.hp <= 0) {
                this._die();
                return null;
            }
        }

        // Shooting
        this.shootTimer--;
        if (this.shootTimer <= 0) {
            this._shoot(groundY);
            this.shootPattern = (this.shootPattern + 1) % 5;
            // Vary shoot speed based on HP
            const hpRatio = this.hp / this.maxHp;
            this.shootInterval = Math.max(25, 60 * hpRatio);
            this.shootTimer = this.shootInterval;
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x -= p.speed;
            p.animTimer += 0.1;

            // Wave pattern
            if (p.wave) {
                p.y = p.baseY + Math.sin(p.animTimer * 3) * p.waveAmp;
            }

            // Remove off-screen
            if (p.x + p.width < -20) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Check collision with player
            if (playerBounds &&
                p.x < playerBounds.x + playerBounds.width &&
                p.x + p.width > playerBounds.x &&
                p.y < playerBounds.y + playerBounds.height &&
                p.y + p.height > playerBounds.y) {
                return 'hit'; // Player got hit
            }
        }

        // Death particles
        for (let i = this.deathParticles.length - 1; i >= 0; i--) {
            const dp = this.deathParticles[i];
            dp.x += dp.vx;
            dp.y += dp.vy;
            dp.vy += 0.1;
            dp.life -= dp.decay;
            if (dp.life <= 0) this.deathParticles.splice(i, 1);
        }

        return null;
    }

    _shoot(groundY) {
        const px = this.x - 10;

        switch (this.shootPattern) {
            case 0: // High shot
                this._addProjectile(px, groundY - 90, 6, false);
                break;
            case 1: // Mid shot
                this._addProjectile(px, groundY - 55, 5, false);
                break;
            case 2: // Low shot (must jump)
                this._addProjectile(px, groundY - 25, 7, false);
                break;
            case 3: // Wave shot
                this._addProjectile(px, groundY - 60, 5, true, 25);
                break;
            case 4: // Double shot
                this._addProjectile(px, groundY - 85, 5.5, false);
                this._addProjectile(px, groundY - 30, 6.5, false);
                break;
        }
    }

    _addProjectile(x, y, speed, wave, waveAmp = 0) {
        this.projectiles.push({
            x,
            y,
            baseY: y,
            width: 24,
            height: 10,
            speed,
            wave,
            waveAmp,
            animTimer: 0
        });
    }

    _die() {
        this.active = false;
        this.defeated = true;

        // Spawn death particles
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        for (let i = 0; i < 40; i++) {
            this.deathParticles.push({
                x: cx + (Math.random() - 0.5) * this.width,
                y: cy + (Math.random() - 0.5) * this.height,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 1) * 8,
                life: 1,
                decay: 0.01 + Math.random() * 0.02,
                size: 3 + Math.random() * 6,
                color: ['#ff0055', '#ff4488', '#00f0ff', '#ffaa00'][Math.floor(Math.random() * 4)]
            });
        }
    }

    takeDamage(amount) {
        if (!this.active) return;
        this.hp = Math.max(0, this.hp - amount);
        this.shakeIntensity = 5;
        this.flashTimer = 6;
        if (this.hp <= 0) {
            this._die();
        }
    }

    draw(groundY) {
        const ctx = this.ctx;

        // Draw death particles even when inactive
        if (this.deathParticles.length > 0) {
            for (const dp of this.deathParticles) {
                ctx.globalAlpha = Math.max(0, dp.life);
                ctx.fillStyle = dp.color;
                ctx.beginPath();
                ctx.arc(dp.x, dp.y, dp.size * dp.life, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        if (!this.active) return;

        ctx.save();

        // Shake offset
        const sx = this.shakeIntensity > 0.1 ? (Math.random() - 0.5) * this.shakeIntensity * 2 : 0;
        const sy = this.shakeIntensity > 0.1 ? (Math.random() - 0.5) * this.shakeIntensity * 2 : 0;

        ctx.translate(this.x + sx, this.y + sy);

        // Flash effect
        if (this.flashTimer > 0 && this.flashTimer % 2 === 0) {
            ctx.globalAlpha = 0.6;
        }

        // === DRAW BOSS BODY ===
        // Shadow/glow beneath
        ctx.fillStyle = 'rgba(255, 0, 85, 0.1)';
        ctx.beginPath();
        ctx.ellipse(this.width / 2, this.height + 10, 50, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main body (dark armor)
        ctx.fillStyle = '#1a0020';
        this._roundRect(ctx, 10, 20, 60, 65, 10);

        // Armor plates
        ctx.fillStyle = '#3a0050';
        this._roundRect(ctx, 15, 25, 50, 25, 6);
        ctx.fillStyle = '#4a0060';
        this._roundRect(ctx, 15, 55, 50, 25, 6);

        // Energy core (center)
        const coreGlow = 0.5 + Math.sin(this.animTimer * 5) * 0.3;
        ctx.fillStyle = `rgba(255, 0, 85, ${coreGlow})`;
        ctx.beginPath();
        ctx.arc(40, 45, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 100, 150, ${coreGlow})`;
        ctx.beginPath();
        ctx.arc(40, 45, 5, 0, Math.PI * 2);
        ctx.fill();
        // Core glow effect
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(255, 0, 85, 0.01)';
        ctx.beginPath();
        ctx.arc(40, 45, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Head
        ctx.fillStyle = '#2a0040';
        this._roundRect(ctx, 15, 0, 50, 28, 8);

        // Visor / Eyes
        const eg = this.eyeGlow;
        ctx.fillStyle = `rgba(255, 0, 85, ${eg})`;
        ctx.fillRect(22, 8, 14, 6);
        ctx.fillRect(44, 8, 14, 6);
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 12;
        ctx.fillRect(22, 8, 14, 6);
        ctx.fillRect(44, 8, 14, 6);
        ctx.shadowBlur = 0;

        // Horns
        ctx.fillStyle = '#5a0080';
        ctx.beginPath();
        ctx.moveTo(15, 5);
        ctx.lineTo(8, -12);
        ctx.lineTo(22, 5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(65, 5);
        ctx.lineTo(72, -12);
        ctx.lineTo(58, 5);
        ctx.closePath();
        ctx.fill();

        // Arms
        const armSwing = Math.sin(this.animTimer * 3) * 5;
        ctx.fillStyle = '#3a0050';
        // Left arm
        ctx.fillRect(-5, 30 + armSwing, 18, 12);
        ctx.fillRect(-8, 38 + armSwing, 12, 18);
        // Right arm
        ctx.fillRect(this.width - 13, 30 - armSwing, 18, 12);
        ctx.fillRect(this.width - 4, 38 - armSwing, 12, 18);

        // Claws
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(-10, 54 + armSwing, 4, 8);
        ctx.fillRect(-4, 54 + armSwing, 4, 8);
        ctx.fillRect(this.width - 2, 54 - armSwing, 4, 8);
        ctx.fillRect(this.width + 4, 54 - armSwing, 4, 8);

        // Legs
        ctx.fillStyle = '#2a0040';
        ctx.fillRect(18, 82, 14, 18);
        ctx.fillRect(48, 82, 14, 18);
        // Boots
        ctx.fillStyle = '#5a0080';
        ctx.fillRect(14, this.height - 6, 22, 8);
        ctx.fillRect(44, this.height - 6, 22, 8);

        ctx.restore();

        // === DRAW PROJECTILES ===
        for (const p of this.projectiles) {
            ctx.save();

            // Projectile glow
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 10;

            // Energy ball
            const projAlpha = 0.7 + Math.sin(p.animTimer * 4) * 0.3;
            ctx.fillStyle = `rgba(255, 0, 85, ${projAlpha})`;
            ctx.beginPath();
            ctx.ellipse(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `rgba(255, 200, 220, ${projAlpha})`;
            ctx.beginPath();
            ctx.ellipse(p.x + p.width / 2, p.y + p.height / 2, p.width / 4, p.height / 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Trail
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(255, 0, 85, 0.15)`;
            ctx.beginPath();
            ctx.ellipse(p.x + p.width / 2 + 15, p.y + p.height / 2, p.width / 1.5, p.height / 3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // === DRAW HP BAR ===
        if (this.entranceProgress >= 1) {
            this._drawHPBar(ctx);
        }
    }

    _drawHPBar(ctx) {
        const barWidth = 160;
        const barHeight = 10;
        const barX = this.canvas.width / 2 - barWidth / 2;
        const barY = 55;
        const hpRatio = Math.max(0, this.hp / this.maxHp);

        // Label
        ctx.font = '600 11px Orbitron, sans-serif';
        ctx.fillStyle = '#ff0055';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ BOSS', this.canvas.width / 2, barY - 8);

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this._roundRect(ctx, barX - 2, barY - 2, barWidth + 4, barHeight + 4, 4);

        // Border
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 4);
        ctx.stroke();

        // HP fill
        const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth * hpRatio, 0);
        gradient.addColorStop(0, '#ff0055');
        gradient.addColorStop(1, hpRatio < 0.3 ? '#ff4400' : '#ff4488');
        ctx.fillStyle = gradient;
        this._roundRect(ctx, barX, barY, barWidth * hpRatio, barHeight, 3);

        // HP glow
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(255, 0, 85, 0.01)';
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
        ctx.shadowBlur = 0;

        ctx.textAlign = 'left';
    }

    _roundRect(ctx, x, y, w, h, r) {
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

    _easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    getBounds() {
        if (!this.active) return null;
        return {
            x: this.x + 10,
            y: this.y + 5,
            width: this.width - 20,
            height: this.height - 10
        };
    }
}
