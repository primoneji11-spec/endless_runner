/* ===================================================
   main.js — UI controller, screen navigation, 
   hero/scenario selection, game lifecycle
   =================================================== */
document.addEventListener('DOMContentLoaded', () => {

    // =========== HERO DATA ===========
    const HEROES = {
        'human':      { name: 'HUMAN RUNNER', cls: 'CLASS: SCOUT',    icon: '🏃', speed: 95, jump: 70 },
        'blue-dino':  { name: 'BLUE DINO',    cls: 'CLASS: AGILE',    icon: '🦕', speed: 80, jump: 90 },
        'green-dino': { name: 'GREEN DINO',   cls: 'CLASS: BALANCED', icon: '🦎', speed: 85, jump: 85 },
        'red-dino':   { name: 'RED DINO',     cls: 'CLASS: POWER',    icon: '🐉', speed: 70, jump: 95 },
        'robot':      { name: 'CYBER ROBOT',  cls: 'CLASS: TANK',     icon: '🤖', speed: 65, jump: 55 },
        'neon-hero':  { name: 'NEON HERO',    cls: 'CLASS: STRIKER',  icon: '⚡', speed: 90, jump: 88 }
    };

    // =========== STATE ===========
    let selectedChar = 'human';
    let selectedEnv = 'desert';
    
    // =========== DOM REFS ===========
    const screens = {
        play:      document.getElementById('screen-play'),
        heroes:    document.getElementById('screen-heroes'),
        scenarios: document.getElementById('screen-scenarios'),
        hud:       document.getElementById('game-hud'),
        pause:     document.getElementById('screen-pause'),
        gameover:  document.getElementById('screen-gameover')
    };
    const bottomNav = document.getElementById('bottom-nav');

    // =========== NAVIGATION ===========
    const overlayScreens = ['pause', 'gameover'];
    const baseScreens = ['play', 'heroes', 'scenarios', 'hud'];

    function showScreen(name) {
        // If showing an overlay, keep the HUD visible behind it
        if (overlayScreens.includes(name)) {
            // Just show the overlay on top
            overlayScreens.forEach(s => screens[s].classList.remove('active'));
            screens[name].classList.add('active');
            return;
        }

        // Hide all screens (base + overlays)
        Object.values(screens).forEach(s => s.classList.remove('active'));
        
        // Show target base screen
        if (screens[name]) screens[name].classList.add('active');

        // For HUD, keep it visible (game is running)
        if (name === 'hud') {
            bottomNav.classList.add('hidden');
            return;
        }

        // Nav state for menu screens
        const isMenu = ['play', 'heroes', 'scenarios'].includes(name);
        if (isMenu) {
            bottomNav.classList.remove('hidden');
            document.querySelectorAll('.nav-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === name);
            });
        } else {
            bottomNav.classList.add('hidden');
        }
    }

    function hideOverlays() {
        overlayScreens.forEach(s => screens[s].classList.remove('active'));
    }

    // Tab buttons (nav + in-card)
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.audio.play('select');
            showScreen(btn.dataset.tab);
        });
    });

    // =========== HERO SELECTION ===========
    const heroGrid = document.getElementById('hero-grid');
    const previewImg = document.getElementById('hero-preview-img');
    const previewName = document.getElementById('hero-preview-name');
    const previewClass = document.getElementById('hero-preview-class');
    const statSpeed = document.getElementById('stat-speed');
    const statSpeedVal = document.getElementById('stat-speed-val');
    const statJump = document.getElementById('stat-jump');
    const statJumpVal = document.getElementById('stat-jump-val');

    function updateHeroPreview(charKey) {
        const h = HEROES[charKey];
        if (!h) return;
        previewImg.textContent = h.icon;
        previewName.textContent = h.name;
        previewClass.textContent = h.cls;
        statSpeed.style.width = h.speed + '%';
        statSpeedVal.textContent = h.speed + '%';
        statJump.style.width = h.jump + '%';
        statJumpVal.textContent = h.jump + '%';
    }

    heroGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.hero-card');
        if (!card) return;
        window.audio.play('select');
        heroGrid.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedChar = card.dataset.char;
        updateHeroPreview(selectedChar);
    });

    document.getElementById('btn-select-hero').addEventListener('click', () => {
        window.audio.play('select');
        showScreen('play');
    });

    // =========== SCENARIO SELECTION ===========
    const scenarioList = document.getElementById('scenario-list');

    scenarioList.addEventListener('click', (e) => {
        const btn = e.target.closest('.sc-select-btn');
        const card = e.target.closest('.scenario-card');
        if (!card) return;
        
        window.audio.play('select');
        
        // Update selection
        scenarioList.querySelectorAll('.scenario-card').forEach(c => {
            c.classList.remove('selected');
            const b = c.querySelector('.sc-select-btn');
            if (b) { b.textContent = 'SELECT'; b.classList.remove('active'); }
            const badge = c.querySelector('.selected-badge');
            if (badge) badge.remove();
        });
        
        card.classList.add('selected');
        selectedEnv = card.dataset.env;
        
        const selBtn = card.querySelector('.sc-select-btn');
        if (selBtn) { selBtn.textContent = 'START RUN'; selBtn.classList.add('active'); }
        
        // Add badge
        const imgWrap = card.querySelector('.sc-img-wrap');
        if (imgWrap) {
            const badge = document.createElement('span');
            badge.className = 'sc-badge selected-badge';
            badge.textContent = 'SELECTED';
            imgWrap.appendChild(badge);
        }
    });

    // =========== GAME INSTANCE ===========
    const game = new Game();

    // Update menu high score
    document.getElementById('menu-hs-val').textContent = game.highScore.toLocaleString();

    // =========== START GAME ===========
    function startGame() {
        window.audio.init();
        hideOverlays();
        showScreen('hud');
        game.start(selectedChar, selectedEnv);
    }

    document.getElementById('btn-start-mission').addEventListener('click', startGame);

    // Start from scenario card "START RUN" button
    scenarioList.addEventListener('click', (e) => {
        if (e.target.closest('.sc-select-btn.active')) {
            startGame();
        }
    });

    // =========== PAUSE ===========
    document.getElementById('btn-pause').addEventListener('click', () => {
        game.pause();
        showScreen('pause');
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
        hideOverlays();
        game.resume();
    });

    document.getElementById('btn-pause-menu').addEventListener('click', () => {
        game.reset();
        hideOverlays();
        showScreen('play');
    });

    // =========== GAME OVER ===========
    window.addEventListener('game:over', (e) => {
        const { score, highScore } = e.detail;
        document.getElementById('go-final-score').textContent = score.toLocaleString();
        document.getElementById('go-high-score').textContent = highScore.toLocaleString();
        document.getElementById('menu-hs-val').textContent = highScore.toLocaleString();

        // Small delay so explosion particles show
        setTimeout(() => {
            showScreen('gameover');
        }, 400);
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
        startGame();
    });

    document.getElementById('btn-go-menu').addEventListener('click', () => {
        game.reset();
        hideOverlays();
        showScreen('play');
    });

    // =========== KEYBOARD SHORTCUTS ===========
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape') {
            if (game.state === 'PLAYING') {
                game.pause();
                showScreen('pause');
            } else if (game.state === 'PAUSED') {
                hideOverlays();
                game.resume();
            }
        }
    });

    // =========== INIT ===========
    updateHeroPreview('human');
    showScreen('play');
});
