/* ===================================================
   Player.js — Character physics, states, and rendering
   Now supports: human, blue-dino, green-dino, red-dino,
   robot, neon-hero — each with unique jump speeds
   =================================================== */
class Player {
    constructor(canvas, charType) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.charType = charType;

        // Dimensions
        this.width = 44;
        this.height = 72;
        this.x = 60;
        this.y = 0;

        // Physics — jump force varies per character
        this.vy = 0;
        this.gravity = 0.55;
        this.jumpForce = this._getJumpForce();
        this.isGrounded = false;

        // Crouching
        this.isCrouching = false;
        this.normalHeight = 72;
        this.crouchHeight = 36;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.frameSpeed = 8; // frames to wait before switching
        this.glowTimer = 0; // for neon-hero glow effect

        // Character colors
        this.colors = this._getColors();
    }

    _getJumpForce() {
        // Base jump forces (tuned for Normal mode)
        // Max jump height ≈ v²/(2*g). With -7.5 & g=0.55 → ~51px
        // Birds spawn at groundY-65, so players MUST crouch under them
        switch (this.charType) {
            case 'human':      return -7.5;
            case 'blue-dino':  return -7.8;
            case 'green-dino': return -7.2;
            case 'red-dino':   return -8.0;
            case 'robot':      return -6.8;  // Heavier, shorter jump
            case 'neon-hero':  return -7.6;  // Lighter, balanced
            default:           return -7.5;
        }
    }

    _getColors() {
        switch (this.charType) {
            case 'human':      return { body: '#00d4e6', head: '#f0c8a0', accent: '#006070', eye: '#00f0ff' };
            case 'blue-dino':  return { body: '#3b82f6', head: '#60a5fa', accent: '#1d4ed8', eye: '#fff' };
            case 'green-dino': return { body: '#10b981', head: '#34d399', accent: '#047857', eye: '#fff' };
            case 'red-dino':   return { body: '#ef4444', head: '#f87171', accent: '#b91c1c', eye: '#fbbf24' };
            case 'robot':      return { body: '#8899aa', head: '#a0b0c0', accent: '#556677', eye: '#00f0ff', joint: '#00d4e6', panel: '#667788' };
            case 'neon-hero':  return { body: '#7b2fbe', head: '#d4a0ff', accent: '#4a1080', eye: '#ff00ff', glow: '#c840ff', suit: '#9b4dca' };
            default:           return { body: '#00d4e6', head: '#f0c8a0', accent: '#006070', eye: '#00f0ff' };
        }
    }

    update(input, groundY, envMods) {
        const grav = this.gravity * envMods.gravityScale;
        const jump = this.jumpForce * envMods.jumpScale;

        // Crouch
        if (input.keys.crouch && this.isGrounded) {
            if (!this.isCrouching) {
                this.isCrouching = true;
                this.y += this.normalHeight - this.crouchHeight;
                this.height = this.crouchHeight;
            }
        } else {
            if (this.isCrouching) {
                this.isCrouching = false;
                this.height = this.normalHeight;
                this.y -= this.normalHeight - this.crouchHeight;
            }
        }

        // Jump
        if (input.keys.jump && this.isGrounded && !this.isCrouching) {
            this.vy = jump;
            this.isGrounded = false;
            window.audio.play('jump');
        }

        // Physics
        this.vy += grav;
        this.y += this.vy;

        if (this.y + this.height >= groundY) {
            this.y = groundY - this.height;
            this.vy = 0;
            this.isGrounded = true;
        }

        // Walk animation
        if (this.isGrounded && !this.isCrouching) {
            this.animTimer++;
            if (this.animTimer >= this.frameSpeed) {
                this.animFrame = (this.animFrame + 1) % 4;
                this.animTimer = 0;
            }
        }

        // Glow timer for neon hero
        this.glowTimer += 0.05;
    }

    draw() {
        const { ctx, x, y, width, height, charType } = this;
        ctx.save();
        ctx.translate(x, y);

        switch (charType) {
            case 'human':
                this._drawHuman(ctx, width, height);
                break;
            case 'robot':
                this._drawRobot(ctx, width, height);
                break;
            case 'neon-hero':
                this._drawNeonHero(ctx, width, height);
                break;
            default:
                this._drawDino(ctx, width, height);
                break;
        }

        ctx.restore();
    }

    _drawHuman(ctx, w, h) {
        const c = this.colors;

        if (this.isCrouching) {
            // Crouching pose — compact rectangle
            ctx.fillStyle = c.accent;
            this._roundRect(ctx, 2, 4, w - 4, h - 8, 6);
            // Visor
            ctx.fillStyle = c.eye;
            ctx.fillRect(w - 14, 8, 12, 4);
            ctx.shadowColor = c.eye;
            ctx.shadowBlur = 8;
            ctx.fillRect(w - 14, 8, 12, 4);
            ctx.shadowBlur = 0;
            return;
        }

        // Head
        ctx.fillStyle = c.head;
        this._roundRect(ctx, 8, 0, 28, 22, 6);

        // Visor / goggles
        ctx.fillStyle = c.eye;
        ctx.fillRect(22, 6, 16, 6);
        ctx.shadowColor = c.eye;
        ctx.shadowBlur = 10;
        ctx.fillRect(22, 6, 16, 6);
        ctx.shadowBlur = 0;

        // Body (armor)
        ctx.fillStyle = c.body;
        this._roundRect(ctx, 4, 22, 36, 28, 4);
        // Accent stripe
        ctx.fillStyle = c.accent;
        ctx.fillRect(4, 32, 36, 4);

        // Legs
        ctx.fillStyle = c.accent;
        const legOffsets = this._getLegOffsets();
        ctx.fillRect(10, 50 + legOffsets[0], 10, 22 - legOffsets[0]);
        ctx.fillRect(24, 50 + legOffsets[1], 10, 22 - legOffsets[1]);

        // Boots
        ctx.fillStyle = c.body;
        ctx.fillRect(8, h - 6, 14, 6);
        ctx.fillRect(22, h - 6, 14, 6);
    }

    _drawRobot(ctx, w, h) {
        const c = this.colors;

        if (this.isCrouching) {
            // Compact form
            ctx.fillStyle = c.accent;
            this._roundRect(ctx, 0, 4, w + 4, h - 8, 8);
            // Visor line
            ctx.fillStyle = c.eye;
            ctx.fillRect(w - 10, 10, 14, 4);
            ctx.shadowColor = c.eye;
            ctx.shadowBlur = 8;
            ctx.fillRect(w - 10, 10, 14, 4);
            ctx.shadowBlur = 0;
            // Panel lines
            ctx.strokeStyle = c.joint;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(6, h / 2); ctx.lineTo(w - 2, h / 2);
            ctx.stroke();
            return;
        }

        // Head (boxy robot head)
        ctx.fillStyle = c.head;
        this._roundRect(ctx, 6, 0, 32, 24, 4);

        // Antenna
        ctx.fillStyle = c.joint;
        ctx.fillRect(20, -8, 4, 10);
        // Antenna tip glow
        const antGlow = 0.5 + Math.sin(this.glowTimer * 3) * 0.5;
        ctx.fillStyle = `rgba(0, 240, 255, ${antGlow})`;
        ctx.beginPath();
        ctx.arc(22, -10, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(22, -10, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Eyes (LED display)
        ctx.fillStyle = c.eye;
        ctx.fillRect(12, 7, 8, 5);
        ctx.fillRect(24, 7, 8, 5);
        ctx.shadowColor = c.eye;
        ctx.shadowBlur = 6;
        ctx.fillRect(12, 7, 8, 5);
        ctx.fillRect(24, 7, 8, 5);
        ctx.shadowBlur = 0;

        // Mouth grill
        ctx.fillStyle = c.accent;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(14 + i * 5, 16, 3, 2);
        }

        // Torso (metallic body)
        ctx.fillStyle = c.body;
        this._roundRect(ctx, 4, 24, 36, 30, 5);

        // Chest panel
        ctx.fillStyle = c.panel;
        this._roundRect(ctx, 10, 28, 24, 12, 3);
        // Panel light
        const panelGlow = 0.4 + Math.sin(this.glowTimer * 2) * 0.4;
        ctx.fillStyle = `rgba(0, 240, 255, ${panelGlow})`;
        ctx.beginPath();
        ctx.arc(22, 34, 4, 0, Math.PI * 2);
        ctx.fill();

        // Joint lines
        ctx.strokeStyle = c.joint;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(4, 40); ctx.lineTo(40, 40);
        ctx.stroke();

        // Arms (mechanical)
        const armSwing = this.isGrounded ? Math.sin(this.animFrame * Math.PI / 2) * 4 : -3;
        ctx.fillStyle = c.accent;
        // Left arm
        ctx.fillRect(-2, 26 + armSwing, 8, 22);
        // Joint circle
        ctx.fillStyle = c.joint;
        ctx.beginPath();
        ctx.arc(2, 37 + armSwing, 3, 0, Math.PI * 2);
        ctx.fill();
        // Right arm
        ctx.fillStyle = c.accent;
        ctx.fillRect(38, 26 - armSwing, 8, 22);
        ctx.fillStyle = c.joint;
        ctx.beginPath();
        ctx.arc(42, 37 - armSwing, 3, 0, Math.PI * 2);
        ctx.fill();

        // Legs (pistons)
        ctx.fillStyle = c.accent;
        const legOffsets = this._getLegOffsets();
        ctx.fillRect(10, 54 + legOffsets[0], 12, 18 - legOffsets[0]);
        ctx.fillRect(24, 54 + legOffsets[1], 12, 18 - legOffsets[1]);

        // Knee joints
        ctx.fillStyle = c.joint;
        ctx.beginPath();
        ctx.arc(16, 58 + legOffsets[0], 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(30, 58 + legOffsets[1], 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Feet (heavy boots)
        ctx.fillStyle = c.body;
        ctx.fillRect(6, h - 6, 18, 6);
        ctx.fillRect(22, h - 6, 18, 6);
    }

    _drawNeonHero(ctx, w, h) {
        const c = this.colors;
        const glowPulse = 0.3 + Math.sin(this.glowTimer * 2) * 0.2;

        if (this.isCrouching) {
            // Crouching slide pose
            ctx.fillStyle = c.accent;
            this._roundRect(ctx, 0, 4, w + 6, h - 8, 8);
            // Neon trim
            ctx.strokeStyle = c.glow;
            ctx.lineWidth = 2;
            ctx.shadowColor = c.glow;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(2, h / 2 + 2);
            ctx.lineTo(w + 4, h / 2 + 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            // Visor
            ctx.fillStyle = c.eye;
            ctx.fillRect(w - 8, 10, 14, 5);
            ctx.shadowColor = c.eye;
            ctx.shadowBlur = 8;
            ctx.fillRect(w - 8, 10, 14, 5);
            ctx.shadowBlur = 0;
            return;
        }

        // Aura glow
        ctx.fillStyle = `rgba(200, 64, 255, ${glowPulse * 0.15})`;
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, w * 0.8, h * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head (with helmet)
        ctx.fillStyle = c.accent;
        this._roundRect(ctx, 6, 0, 32, 24, 8);
        // Helmet highlight
        ctx.fillStyle = c.suit;
        this._roundRect(ctx, 10, 2, 24, 8, 4);

        // Visor (full width glowing)
        ctx.fillStyle = c.eye;
        ctx.shadowColor = c.eye;
        ctx.shadowBlur = 12;
        this._roundRect(ctx, 10, 8, 24, 7, 3);
        ctx.shadowBlur = 0;

        // Body (suit)
        ctx.fillStyle = c.body;
        this._roundRect(ctx, 4, 24, 36, 28, 5);

        // Neon energy lines on suit
        ctx.strokeStyle = c.glow;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = c.glow;
        ctx.shadowBlur = 6;
        // Center line
        ctx.beginPath();
        ctx.moveTo(22, 26);
        ctx.lineTo(22, 52);
        ctx.stroke();
        // V pattern
        ctx.beginPath();
        ctx.moveTo(10, 30);
        ctx.lineTo(22, 42);
        ctx.lineTo(34, 30);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Energy orb on chest
        const orbGlow = 0.5 + Math.sin(this.glowTimer * 4) * 0.4;
        ctx.fillStyle = `rgba(200, 64, 255, ${orbGlow})`;
        ctx.beginPath();
        ctx.arc(22, 36, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 200, 255, ${orbGlow})`;
        ctx.beginPath();
        ctx.arc(22, 36, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Arms
        const armBob = this.isGrounded ? Math.sin(this.animFrame * Math.PI / 2) * 3 : -4;
        ctx.fillStyle = c.suit;
        // Left
        ctx.fillRect(-2, 26 + armBob, 8, 20);
        // Right
        ctx.fillRect(38, 26 - armBob, 8, 20);
        // Arm glowing bands
        ctx.fillStyle = `rgba(200, 64, 255, ${glowPulse + 0.2})`;
        ctx.fillRect(-1, 34 + armBob, 6, 3);
        ctx.fillRect(39, 34 - armBob, 6, 3);

        // Legs
        ctx.fillStyle = c.accent;
        const legOffsets = this._getLegOffsets();
        ctx.fillRect(8, 52 + legOffsets[0], 12, 20 - legOffsets[0]);
        ctx.fillRect(24, 52 + legOffsets[1], 12, 20 - legOffsets[1]);

        // Knee neon bands
        ctx.fillStyle = `rgba(200, 64, 255, ${glowPulse + 0.3})`;
        ctx.fillRect(9, 60 + legOffsets[0], 10, 3);
        ctx.fillRect(25, 60 + legOffsets[1], 10, 3);

        // Boots (energy-infused)
        ctx.fillStyle = c.suit;
        ctx.fillRect(6, h - 7, 16, 7);
        ctx.fillRect(22, h - 7, 16, 7);
        // Boot glow
        ctx.fillStyle = `rgba(200, 64, 255, ${glowPulse * 0.8})`;
        ctx.fillRect(8, h - 3, 12, 3);
        ctx.fillRect(24, h - 3, 12, 3);
    }

    _drawDino(ctx, w, h) {
        const c = this.colors;

        if (this.isCrouching) {
            // Flat dino
            ctx.fillStyle = c.body;
            this._roundRect(ctx, 0, 6, w + 10, h - 12, 8);
            // Head bump
            ctx.fillStyle = c.head;
            this._roundRect(ctx, w - 4, 0, 18, 18, 6);
            // Eye
            ctx.fillStyle = c.eye;
            ctx.fillRect(w + 4, 4, 5, 5);
            return;
        }

        // Body
        ctx.fillStyle = c.body;
        this._roundRect(ctx, 0, 16, 34, 36, 8);

        // Head
        ctx.fillStyle = c.head;
        this._roundRect(ctx, 18, 0, 28, 24, 8);

        // Eye
        ctx.fillStyle = c.eye;
        ctx.beginPath();
        ctx.arc(36, 8, 4, 0, Math.PI * 2);
        ctx.fill();
        // Pupil
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(37, 8, 2, 0, Math.PI * 2);
        ctx.fill();

        // Jaw line
        ctx.fillStyle = c.accent;
        ctx.fillRect(30, 18, 16, 3);

        // Tail
        ctx.fillStyle = c.body;
        ctx.beginPath();
        ctx.moveTo(0, 24);
        ctx.lineTo(-14, 18);
        ctx.lineTo(-10, 30);
        ctx.closePath();
        ctx.fill();

        // Legs
        ctx.fillStyle = c.accent;
        const legOffsets = this._getLegOffsets();
        ctx.fillRect(6, 52 + legOffsets[0], 10, 20 - legOffsets[0]);
        ctx.fillRect(20, 52 + legOffsets[1], 10, 20 - legOffsets[1]);

        // Feet
        ctx.fillStyle = c.body;
        ctx.fillRect(4, h - 6, 14, 6);
        ctx.fillRect(18, h - 6, 14, 6);

        // Arm
        ctx.fillStyle = c.accent;
        const armBob = this.isGrounded ? Math.sin(this.animFrame * Math.PI / 2) * 3 : -4;
        ctx.fillRect(28, 28 + armBob, 6, 14);
    }

    _getLegOffsets() {
        if (!this.isGrounded) return [6, 6]; // Tucked in air
        switch (this.animFrame) {
            case 0: return [0, 8];
            case 1: return [4, 4];
            case 2: return [8, 0];
            case 3: return [4, 4];
            default: return [0, 0];
        }
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

    getBounds() {
        return {
            x: this.x + 6,
            y: this.y + 4,
            width: this.width - 12,
            height: this.height - 8
        };
    }
}
