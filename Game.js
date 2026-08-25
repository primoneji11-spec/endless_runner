/* ===================================================
   Game.js — Core game loop, state machine, scoring,
   phase system, difficulty modes, and boss battles
   =================================================== */

// Difficulty presets
const DIFFICULTY_CONFIGS = {
    normal: {
        jumpScale: 1.5,       // Base jump (can't clear birds)
        initialSpeed: 1.0,
        speedRamp: 0.00015,
        obstacleMinGap: 55,
        obstacleSpawnMin: 50,
        obstacleSpawnMax: 67,
        bossThreshold: 1000,
        label: 'NORMAL'
    },
    hard: {
        jumpScale: 1.0,       // Same low jump
        initialSpeed: 1.5,    // Starts 50% faster
        speedRamp: 0.0005,    // Ramps 2x faster
        obstacleMinGap: 35,   // Obstacles much closer
        obstacleSpawnMin: 30,
        obstacleSpawnMax: 50,
        bossThreshold: 800,
        label: 'HARD'
    }
};

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
        this.boss = new BossManager(this.canvas);
        this.player = null;

        // State
        this.state = 'MENU';
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('neo_runner_hs')) || 0;
        this.speed = 1;
        this.scoreNextBeep = 100;

        // Phase system
        this.currentPhase = 'desert';
        this.phaseThresholds = [
            { score: 500, phase: 'cybercity' },
            { score: 1000, phase: 'volcano' }
        ];
        this.phaseTriggered = {};
        this.bossSpawned = false;
        this.bossDefeated = false;
        this.bossScoreThreshold = 1000;

        // Character / Environment / Difficulty
        this.charType = 'human';
        this.envType = 'desert';
        this.difficulty = 'normal';
        this.playerName = 'Escolha Nome';
        this.diffConfig = DIFFICULTY_CONFIGS.normal;

        // HUD references
        this.hudScore = document.getElementById('hud-score');
        this.hudVelocity = document.getElementById('hud-velocity');
        this.hudVelPill = document.getElementById('hud-vel-pill');
        this.hudProgress = document.getElementById('hud-progress');
        this.hudProgressLabel = document.getElementById('hud-progress-label');
        this.hudPhaseLabel = document.getElementById('hud-phase-label');

        // Start the loop
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

    _updateGroundY() { this.groundY = this.canvas.height - 90; }

    // ========= PUBLIC API =========
    start(charType, envType, difficulty, playerName) {
        this.charType = charType;
        this.envType = envType;
        this.difficulty = difficulty || 'normal';
        this.playerName = playerName || 'Escolha Nome';
        this.diffConfig = DIFFICULTY_CONFIGS[this.difficulty] || DIFFICULTY_CONFIGS.normal;

        this.player = new Player(this.canvas, charType);
        this.player.y = this.groundY - this.player.height;

        this.env.setEnvironment(envType);
        this.obs.setEnvironment(envType);
        this.obs.setDifficulty(this.diffConfig);
        this.particles.clear();
        this.boss = new BossManager(this.canvas);

        this.score = 0;
        this.speed = this.diffConfig.initialSpeed;
        this.scoreNextBeep = 100;
        this.currentPhase = envType;
        this.phaseTriggered = {};
        this.bossSpawned = false;
        this.bossDefeated = false;
        this.bossScoreThreshold = this.diffConfig.bossThreshold;
        this.input.reset();
        this.state = 'PLAYING';
        this.lastTime = performance.now();
        window.audio.startBgMusic();

        const thumbMap = {
            'human': 'assets/human_runner.png', 'blue-dino': 'assets/blue_dino.png',
            'green-dino': 'assets/green_dino.png', 'red-dino': 'assets/red_dino.png',
            'robot': 'assets/human_runner.png', 'neon-hero': 'assets/human_runner.png'
        };
        const thumbImg = document.getElementById('hud-char-img');
        if (thumbImg) thumbImg.src = thumbMap[charType] || thumbMap.human;
    }

    pause() { if (this.state === 'PLAYING') { this.state = 'PAUSED'; window.audio.stopBgMusic(); } }
    resume() { if (this.state === 'PAUSED') { this.state = 'PLAYING'; this.lastTime = performance.now(); window.audio.startBgMusic(); } }
    reset() { this.state = 'MENU'; this.obs.obstacles = []; this.particles.clear(); this.boss.active = false; this.boss.projectiles = []; window.audio.stopBgMusic(); }

    gameOver() {
        this.state = 'GAMEOVER';
        window.audio.stopBgMusic();
        window.audio.play('death');
        
        const finalScore = Math.floor(this.score);
        if (finalScore > this.highScore) {
            this.highScore = finalScore;
            localStorage.setItem('neo_runner_hs', this.highScore);
        }
        
        if (this.player) {
            this.particles.emit(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 30, '#ff0055', { spread: 8, sizeMax: 6 });
        }

        const isNewTop5 = this.saveToRanking(this.playerName, finalScore, this.difficulty);

        window.dispatchEvent(new CustomEvent('game:over', { 
            detail: { 
                score: finalScore, 
                highScore: this.highScore,
                playerName: this.playerName,
                difficulty: this.difficulty,
                isNewTop10: isNewTop10
            } 
        }));
    }

    saveToRanking(name, score, difficulty) {
        let ranking = JSON.parse(localStorage.getItem('neo_runner_leaderboard')) || [];
        const newRecord = {
            name: name || 'Escolher Nome',
            score: Math.floor(score),
            difficulty: difficulty || 'normal',
            date: new Date().toLocaleDateString('pt-BR')
        };
        ranking.push(newRecord);
        // Ordena por score descendente
        ranking.sort((a, b) => b.score - a.score);
        // Limita aos top 10
        ranking = ranking.slice(0, 10);
        localStorage.setItem('neo_runner_leaderboard', JSON.stringify(ranking));

        // Retorna true se a nova pontuação foi inserida no ranking
        return ranking.some(item => item.score === newRecord.score && item.name === newRecord.name && item.date === newRecord.date);
    }

    // ========= GAME LOOP =========
    _loop(now) {
        const dt = Math.min(now - this.lastTime, 33);
        this.lastTime = now;
        if (this.state === 'PLAYING') this._update(dt);
        this._draw();
        requestAnimationFrame(this._loop);
    }

    _update(dt) {
        this.speed += this.diffConfig.speedRamp;
        this.score += 0.12 * this.speed;

        if (this.score >= this.scoreNextBeep) {
            window.audio.play('score');
            this.scoreNextBeep += 100;
        }

        // Phase transitions
        for (const pt of this.phaseThresholds) {
            if (this.score >= pt.score && !this.phaseTriggered[pt.phase]) {
                this.phaseTriggered[pt.phase] = true;
                this.currentPhase = pt.phase;
                this.env.transitionTo(pt.phase);
                this.obs.setEnvironment(pt.phase);
                window.audio.play('score');
            }
        }

        // Boss spawn at threshold
        if (this.score >= this.bossScoreThreshold && !this.bossSpawned && !this.bossDefeated) {
            this.bossSpawned = true;
            this.boss.spawn(this.canvas.width, this.groundY);
            window.audio.play('score');
        }

        // HUD updates
        const scoreStr = String(Math.floor(this.score)).padStart(6, '0');
        this.hudScore.textContent = scoreStr.replace(/(\d{3})$/, ',$1');
        const velStr = this.speed.toFixed(1) + 'x';
        this.hudVelocity.textContent = velStr;
        this.hudVelPill.textContent = velStr;

        // Progress bar logic
        this._updateProgressBar();

        // Systems
        this.env.update(this.speed);
        this.player.update(this.input, this.groundY, this.env.getModifiers());

        // Don't spawn normal obstacles during boss fight
        if (!this.boss.active) {
            this.obs.update(this.speed, this.groundY);
        } else {
            // Still move existing obstacles off screen
            for (let i = this.obs.obstacles.length - 1; i >= 0; i--) {
                this.obs.obstacles[i].x -= 6 * this.speed;
                if (this.obs.obstacles[i].x + this.obs.obstacles[i].width < -20) this.obs.obstacles.splice(i, 1);
            }
        }

        this.particles.update(this.speed);

        // Running particles
        if (this.player.isGrounded && !this.player.isCrouching && Math.random() > 0.65) {
            const dustColor = this.env.currentPhase === 'space' ? '#00f0ff' :
                              this.env.currentPhase === 'cybercity' ? '#c840ff' :
                              this.env.currentPhase === 'volcano' ? '#ff6600' :
                              this.env.getGroundColor();
            this.particles.emit(this.player.x + 10, this.groundY - 2, 1, dustColor, { spread: 2, speedY: -1, sizeMax: 3, lifeMax: 0.5 });
        }

        // Boss update
        if (this.boss.active || this.boss.deathParticles.length > 0) {
            const bossResult = this.boss.update(this.groundY, this.player.getBounds());
            if (bossResult === 'hit') {
                this.gameOver();
                return;
            }
            if (!this.boss.active && this.boss.defeated && !this.bossDefeated) {
                this.bossDefeated = true;
                this.particles.emit(this.canvas.width - 80, this.groundY - 80, 25, '#ff8800', { spread: 10, sizeMax: 8 });
                window.audio.play('score');
            }
        }

        // Normal obstacle collision
        if (this.obs.checkCollision(this.player.getBounds())) {
            this.gameOver();
        }
    }

    _updateProgressBar() {
        let progress = 0, label = '';
        const s = this.score;

        if (s < 500) {
            progress = (s / 500) * 100;
            label = 'CYBER CITY: ' + Math.floor(500 - s);
        } else if (s < 1000) {
            progress = ((s - 500) / 500) * 100;
            label = 'BOSS: ' + Math.floor(1000 - s);
        } else if (this.boss.active) {
            progress = ((this.boss.maxHp - this.boss.hp) / this.boss.maxHp) * 100;
            label = '⚠ BOSS FIGHT';
        } else {
            progress = 100;
            label = this.bossDefeated ? '★ BOSS DEFEATED' : 'RUNNING...';
        }

        this.hudProgress.style.width = Math.min(100, progress) + '%';

        // Change progress bar color based on context
        if (this.boss.active) {
            this.hudProgress.style.background = 'linear-gradient(90deg, #ff0055, #ff4488)';
        } else if (s >= 500) {
            this.hudProgress.style.background = 'linear-gradient(90deg, #c840ff, #ff00ff)';
        } else {
            this.hudProgress.style.background = 'linear-gradient(90deg, var(--cyan-dim), var(--cyan))';
        }

        if (this.hudProgressLabel) {
            this.hudProgressLabel.textContent = label;
            this.hudProgressLabel.dataset.boss = this.boss.active ? 'true' : 'false';
        }
        if (this.hudPhaseLabel) {
            const phaseNames = { desert: 'DESERT', forest: 'FOREST', space: 'SPACE', cybercity: 'CYBER CITY', volcano: 'VOLCANO' };
            this.hudPhaseLabel.textContent = phaseNames[this.currentPhase] || 'DESERT';
        }
    }

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === 'MENU') {
            this.env.update(0.4);
            this.env.draw(this.groundY);
            return;
        }

        this.env.draw(this.groundY);
        this.obs.draw();
        this.particles.draw();
        if (this.player) this.player.draw();
        this.boss.draw(this.groundY);
    }
}
