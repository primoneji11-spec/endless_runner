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
    let selectedDifficulty = 'normal';
    
    // =========== DOM REFS ===========
    const screens = {
        play:      document.getElementById('screen-play'),
        heroes:    document.getElementById('screen-heroes'),
        scenarios: document.getElementById('screen-scenarios'),
        ranking:   document.getElementById('screen-ranking'),
        hud:       document.getElementById('game-hud'),
        pause:     document.getElementById('screen-pause'),
        gameover:  document.getElementById('screen-gameover'),
        'mission-setup': document.getElementById('screen-mission-setup')
    };
    const bottomNav = document.getElementById('bottom-nav');

    // =========== NAVIGATION ===========
    const overlayScreens = ['pause', 'gameover', 'mission-setup'];
    const baseScreens = ['play', 'heroes', 'scenarios', 'ranking', 'hud'];

    function showScreen(name) {
        // Se estiver exibindo um overlay, mantém o HUD visível atrás dele
        if (overlayScreens.includes(name)) {
            overlayScreens.forEach(s => screens[s].classList.remove('active'));
            screens[name].classList.add('active');
            return;
        }

        // Esconde todas as telas
        Object.values(screens).forEach(s => s.classList.remove('active'));
        
        // Exibe a tela alvo
        if (screens[name]) screens[name].classList.add('active');

        // Carrega o ranking dinamicamente se a tela for aberta
        if (name === 'ranking') {
            renderRanking();
        }

        // Mantém o HUD visível durante a partida
        if (name === 'hud') {
            bottomNav.classList.add('hidden');
            return;
        }

        // Controla exibição do Bottom Nav nas telas de menu
        const isMenu = ['play', 'heroes', 'scenarios', 'ranking'].includes(name);
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

    // Atualiza o recorde do menu inicial
    document.getElementById('menu-hs-val').textContent = game.highScore.toLocaleString();

    // =========== CONFIGURAÇÃO DE DIFICULDADE (MISSION SETUP) ===========
    const diffNormalBtn = document.getElementById('diff-normal-btn');
    const diffHardBtn = document.getElementById('diff-hard-btn');

    diffNormalBtn.addEventListener('click', () => {
        window.audio.play('select');
        diffNormalBtn.classList.add('active');
        diffHardBtn.classList.remove('active');
        selectedDifficulty = 'normal';
    });

    diffHardBtn.addEventListener('click', () => {
        window.audio.play('select');
        diffHardBtn.classList.add('active');
        diffNormalBtn.classList.remove('active');
        selectedDifficulty = 'hard';
    });

    function openMissionSetup() {
        window.audio.play('select');
        const lastCodename = localStorage.getItem('neo_runner_codename') || 'RUNNER_001';
        document.getElementById('input-player-name').value = lastCodename;
        
        // Mantém a última dificuldade ou normal por padrão
        selectedDifficulty = 'normal';
        diffNormalBtn.classList.add('active');
        diffHardBtn.classList.remove('active');
        
        showScreen('mission-setup');
    }

    document.getElementById('btn-start-mission').addEventListener('click', openMissionSetup);

    // Iniciar a partir do botão do card de cenários
    scenarioList.addEventListener('click', (e) => {
        if (e.target.closest('.sc-select-btn.active')) {
            openMissionSetup();
        }
    });

    document.getElementById('btn-launch-mission').addEventListener('click', () => {
        window.audio.play('select');
        let codename = document.getElementById('input-player-name').value.trim().toUpperCase();
        if (!codename) codename = 'RUNNER_001';
        
        // Persiste o codinome
        localStorage.setItem('neo_runner_codename', codename);
        
        hideOverlays();
        window.audio.init();
        showScreen('hud');
        game.start(selectedChar, selectedEnv, selectedDifficulty, codename);
    });

    document.getElementById('btn-cancel-mission').addEventListener('click', () => {
        window.audio.play('select');
        hideOverlays();
    });

    // =========== RENDERIZAÇÃO DE RANKING (LEADERBOARD) ===========
    function renderRanking() {
        const ranking = JSON.parse(localStorage.getItem('neo_runner_leaderboard')) || [];
        const tbody = document.getElementById('ranking-list-body');
        const emptyMsg = document.getElementById('ranking-empty-msg');
        
        tbody.innerHTML = '';
        
        if (ranking.length === 0) {
            emptyMsg.classList.remove('hidden');
            return;
        }
        
        emptyMsg.classList.add('hidden');
        ranking.forEach((record, index) => {
            const tr = document.createElement('tr');
            const badgeClass = record.difficulty === 'hard' ? 'hard' : 'normal';
            const badgeLabel = record.difficulty === 'hard' ? 'HARD' : 'NORMAL';
            
            tr.innerHTML = `
                <td><span class="rank-pos">#${index + 1}</span></td>
                <td><span class="rank-name">${record.name}</span></td>
                <td><span class="badge-diff ${badgeClass}">${badgeLabel}</span></td>
                <td><span class="rank-score">${record.score.toLocaleString()}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

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
        const { score, highScore, playerName, difficulty, isNewTop10 } = e.detail;
        document.getElementById('go-final-score').textContent = score.toLocaleString();
        document.getElementById('go-high-score').textContent = highScore.toLocaleString();
        document.getElementById('menu-hs-val').textContent = highScore.toLocaleString();
        document.getElementById('go-runner-badge').textContent = `RUNNER: ${playerName}`;
        
        const rankNotice = document.getElementById('go-rank-notice');
        if (isNewTop10) {
            rankNotice.classList.remove('hidden');
        } else {
            rankNotice.classList.add('hidden');
        }

        // Pequeno atraso para mostrar partículas de explosão
        setTimeout(() => {
            showScreen('gameover');
        }, 400);
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
        hideOverlays();
        window.audio.init();
        showScreen('hud');
        game.start(selectedChar, selectedEnv, game.difficulty, game.playerName);
    });

    document.getElementById('btn-go-menu').addEventListener('click', () => {
        game.reset();
        hideOverlays();
        showScreen('play');
    });

    // =========== ATALHOS DE TECLADO ===========
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

    // =========== INICIALIZAÇÃO ===========
    updateHeroPreview('human');
    showScreen('play');
});
