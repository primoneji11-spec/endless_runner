/* ===================================================
   Game.js — Core game loop, state machine, scoring
   =================================================== */
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this._resize();
        window.addEventListener('resize', () => this._resize());

        this.groundY = 0;
        this._updateGroundY();

        // Systems
        this.input = new InputHandler();
        this.env = new EnvironmentManager(this.canvas);
        this.obs = new ObstacleManager(this.canvas);
        this.particles = new ParticleSystem(this.canvas);
        this.player = null;

        // State
        this.state = 'MENU'; // MENU | PLAYING | PAUSED | GAMEOVER
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('neo_runner_hs')) || 0;
        this.speed = 1;
        this.scoreNextBeep = 100;

        // Character / Environment selection
        this.charType = 'human';
        this.envType = 'desert';

        // HUD references
        this.hudScore = document.getElementById('hud-score');
        this.hudVelocity = document.getElementById('hud-velocity');
        this.hudVelPill = document.getElementById('hud-vel-pill');
        this.hudProgress = document.getElementById('hud-progress');

        // Start the loop (always running for menu animation)
        this.lastTime = performance.now();
        this._loop = this._loop.bind(this);
        requestAnimationFrame(this._loop);
    }

    _resize() {
        const app = document.getElementById('app');
        this.canvas.width = app.clientWidth;
        this.canvas.height = app.clientHeight;
        this._updateGroundY();
    }

    _updateGroundY() {
        this.groundY = this.canvas.height - 90;
    }

    // ========= PUBLIC API =========
    start(charType, envType) {
        this.charType = charType;
        this.envType = envType;

        this.player = new Player(this.canvas, charType);
        this.player.y = this.groundY - this.player.height;

        this.env.setEnvironment(envType);
        this.obs.setEnvironment(envType);
        this.particles.clear();

        this.score = 0;
        this.speed = 1;
        this.scoreNextBeep = 100;
        this.input.reset();

        this.state = 'PLAYING';
        this.lastTime = performance.now();

        window.audio.startBgMusic();

        // Update HUD char thumb
        const thumbMap = {
            'human': 'assets/human_runner.png',
            'blue-dino': 'assets/blue_dino.png',
            'green-dino': 'assets/green_dino.png',
            'red-dino': 'assets/red_dino.png'
        };
        const thumbImg = document.getElementById('hud-char-img');
        if (thumbImg) thumbImg.src = thumbMap[charType] || thumbMap.human;
    }

    pause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            window.audio.stopBgMusic();
        }
    }

    resume() {
        if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.lastTime = performance.now();
            window.audio.startBgMusic();
        }
    }

    reset() {
        this.state = 'MENU';
        this.obs.obstacles = [];
        this.particles.clear();
        window.audio.stopBgMusic();
    }

    gameOver() {
        this.state = 'GAMEOVER';
        window.audio.stopBgMusic();
        window.audio.play('death');

        if (this.score > this.highScore) {
            this.highScore = Math.floor(this.score);
            localStorage.setItem('neo_runner_hs', this.highScore);
        }

        // Explosion particles
        if (this.player) {
            this.particles.emit(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height / 2,
                30, '#ff0055', { spread: 8, sizeMax: 6 }
            );
        }

        // Dispatch event for main.js to handle UI
        window.dispatchEvent(new CustomEvent('game:over', {
            detail: { score: Math.floor(this.score), highScore: this.highScore }
        }));
    }

    // ========= GAME LOOP =========
    _loop(now) {
        const dt = Math.min(now - this.lastTime, 33); // Cap at ~30fps min
        this.lastTime = now;

        if (this.state === 'PLAYING') {
            this._update(dt);
        }

        this._draw();
        requestAnimationFrame(this._loop);
    }

    _update(dt) {
        // Speed ramp-up
        this.speed += 0.0004;
        this.score += 0.12 * this.speed;

        // Score milestones
        if (this.score >= this.scoreNextBeep) {
            window.audio.play('score');
            this.scoreNextBeep += 100;
        }

        // Update HUD
        const scoreStr = String(Math.floor(this.score)).padStart(6, '0');
        this.hudScore.textContent = scoreStr.replace(/(\d{3})$/, ',$1');
        const velStr = this.speed.toFixed(1) + 'x';
        this.hudVelocity.textContent = velStr;
        this.hudVelPill.textContent = velStr;
        // Progress bar (loops every 500 points)
        this.hudProgress.style.width = ((this.score % 500) / 500 * 100) + '%';

        // Systems
        this.env.update(this.speed);
        this.player.update(this.input, this.groundY, this.env.getModifiers());
        this.obs.update(this.speed, this.groundY);
        this.particles.update(this.speed);

        // Running particles
        if (this.player.isGrounded && !this.player.isCrouching && Math.random() > 0.65) {
            const dustColor = this.env.envType === 'space' ? '#00f0ff' : this.env.getGroundColor();
            this.particles.emit(
                this.player.x + 10,
                this.groundY - 2,
                1, dustColor,
                { spread: 2, speedY: -1, sizeMax: 3, lifeMax: 0.5 }
            );
        }

        // Collision
        if (this.obs.checkCollision(this.player.getBounds())) {
            this.gameOver();
        }
    }

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Idle menu animation
        if (this.state === 'MENU') {
            this.env.update(0.4);
            this.env.draw(this.groundY);
            return;
        }

        this.env.draw(this.groundY);
        this.obs.draw();
        this.particles.draw();
        if (this.player) this.player.draw();
    }
}
