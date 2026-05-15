/* ===================================================
   Player.js — Character physics, states, and rendering
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

        // Physics
        this.vy = 0;
        this.gravity = 0.55;
        this.jumpForce = -12.5;
        this.isGrounded = false;

        // Crouching
        this.isCrouching = false;
        this.normalHeight = 72;
        this.crouchHeight = 36;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.frameSpeed = 8; // frames to wait before switching

        // Character colors
        this.colors = this._getColors();
    }

    _getColors() {
        switch (this.charType) {
            case 'human':     return { body: '#00d4e6', head: '#f0c8a0', accent: '#006070', eye: '#00f0ff' };
            case 'blue-dino': return { body: '#3b82f6', head: '#60a5fa', accent: '#1d4ed8', eye: '#fff' };
            case 'green-dino':return { body: '#10b981', head: '#34d399', accent: '#047857', eye: '#fff' };
            case 'red-dino':  return { body: '#ef4444', head: '#f87171', accent: '#b91c1c', eye: '#fbbf24' };
            default:          return { body: '#00d4e6', head: '#f0c8a0', accent: '#006070', eye: '#00f0ff' };
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
    }

    draw() {
        const { ctx, x, y, width, height, charType } = this;
        ctx.save();
        ctx.translate(x, y);

        if (charType === 'human') {
            this._drawHuman(ctx, width, height);
        } else {
            this._drawDino(ctx, width, height);
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
