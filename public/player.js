let ws = null;
let playerId = null;
let playerName = '';
let gameCode = '';
let currentScore = 0;
let totalQuestions = 0;
let isAnswering = false;
let timerAnimation = null;
let selectedAnswerIndex = -1;
let lastGained = 0;
let potentialInterval = null;
let potentialStartTime = 0;
let potentialDuration = 0;
let selectedPowerUps = new Set();
let phaseInterval = null;
let toastTimer = null;
let powerUpsLeft = { star: 2, thunder: 1, devil: 1, reduce: 1, expand: 1, shield: 1, earthquake: 1, wizard: 1, tornado: 1 };

function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        if (playerName && gameCode) {
            ws.send(JSON.stringify({ type: 'joinGame', gameCode, playerName }));
        }
    };

    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
            case 'joined': onJoined(msg); break;
            case 'error': showError(msg.message); break;
            case 'themeChanged': onThemeChanged(msg); break;
            case 'gameStarted': onGameStarted(msg); break;
            case 'powerUpPhase': onPowerUpPhase(msg); break;
            case 'newQuestion': onNewQuestion(msg); break;
            case 'answerResult': onAnswerResult(msg); break;
            case 'scoreHit': onScoreHit(msg); break;
            case 'shieldBlocked': onShieldBlocked(msg); break;
            case 'showAnswer': onShowAnswer(msg); break;
            case 'earthquakeHit': onEarthquakeHit(msg); break;
            case 'wizardHit': onWizardHit(msg); break;
            case 'tornadoHit': onTornadoHit(msg); break;
            case 'gameFinished': onGameFinished(msg); break;
        }
    };

    ws.onclose = () => {
        setTimeout(connect, 2000);
    };
}

function showError(msg) {
    const el = document.getElementById('join-error');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('join-btn').disabled = false;
    document.getElementById('join-btn').querySelector('.btn-text').textContent = 'Tham gia';
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function onJoined(msg) {
    playerId = msg.id;
    totalQuestions = msg.totalQuestions;
    if (msg.powerUps) powerUpsLeft = { ...msg.powerUps };
    if (msg.theme && window.theme) {
        window.theme.apply(msg.theme);
    }
    showScreen('waiting-screen');
}

function onThemeChanged(msg) {
    if (window.theme && msg.theme) {
        window.theme.apply(msg.theme);
    }
}

function onGameStarted(msg) {
    if (window.sound) window.sound.play('start');
    showScreen('player-quiz-screen');
}

function onPowerUpPhase(msg) {
    isAnswering = false;
    selectedAnswerIndex = -1;
    selectedPowerUps = new Set();
    if (msg.powerUps) powerUpsLeft = { ...msg.powerUps };
    clearFxLayer();
    clearAnswerFxLayer();
    clearQuestionDebuffs();

    currentScore = msg.questionIndex === 0 ? 0 : currentScore;

    document.getElementById('player-question-num').textContent = `${msg.questionIndex + 1}/${msg.totalQuestions}`;
    document.getElementById('player-score').textContent = currentScore;
    document.getElementById('player-question-badge').textContent = `Câu ${msg.questionIndex + 1}`;
    document.getElementById('player-question-text').textContent = msg.text;

    const opts = ['opt-text-0', 'opt-text-1', 'opt-text-2', 'opt-text-3', 'opt-text-4', 'opt-text-5'];
    opts.forEach(id => { document.getElementById(id).textContent = ''; });

    const btns = document.querySelectorAll('.player-option');
    btns.forEach(b => {
        b.disabled = true;
        b.className = 'player-option ' + b.classList[1];
        b.style.transform = '';
        b.style.opacity = '1';
        b.style.display = 'none';
    });
    document.getElementById('player-options').style.opacity = '0.4';

    const gained = document.getElementById('player-gained');
    if (gained) gained.className = 'player-gained';

    resetPowerUps();
    startPhaseCountdown(msg.timeLimit);
    showScreen('player-quiz-screen');
}

function startPhaseCountdown(seconds) {
    if (phaseInterval) { clearInterval(phaseInterval); phaseInterval = null; }
    const banner = document.getElementById('player-phase-banner');
    banner.style.display = 'flex';
    let remaining = seconds;
    banner.textContent = `⏳ Chọn item — còn ${remaining}s`;
    phaseInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(phaseInterval);
            phaseInterval = null;
            banner.textContent = '⏳ Hết giờ chọn item!';
        } else {
            banner.textContent = `⏳ Chọn item — còn ${remaining}s`;
            if (remaining <= 5 && window.sound) window.sound.play('tick');
        }
    }, 1000);
}

function onNewQuestion(msg) {
    isAnswering = true;
    selectedAnswerIndex = -1;
    if (phaseInterval) { clearInterval(phaseInterval); phaseInterval = null; }
    if (msg.powerUps) powerUpsLeft = { ...msg.powerUps };

    clearFxLayer();
    clearAnswerFxLayer();
    clearQuestionDebuffs();
    (msg.usedPowerUps || []).forEach(pu => {
        playPowerUpFx(pu);
        if (window.sound) window.sound.play(pu);
    });

    document.getElementById('player-phase-banner').style.display = 'none';
    document.getElementById('player-options').style.opacity = '1';

    if (msg.tornadoBlind) {
        document.getElementById('player-options').classList.add('wizard-blind');
    }

    document.getElementById('player-question-num').textContent = `${msg.questionIndex + 1}/${msg.totalQuestions}`;
    document.getElementById('player-score').textContent = currentScore;
    document.getElementById('player-question-badge').textContent = `Câu ${msg.questionIndex + 1}`;
    document.getElementById('player-question-text').textContent = msg.text;

    const opts = ['opt-text-0', 'opt-text-1', 'opt-text-2', 'opt-text-3', 'opt-text-4', 'opt-text-5'];
    msg.options.forEach((opt, i) => {
        document.getElementById(opts[i]).textContent = opt;
    });

    const btns = document.querySelectorAll('.player-option');
    btns.forEach((b, i) => {
        b.disabled = false;
        b.className = 'player-option ' + b.classList[1];
        b.style.transform = '';
        b.style.opacity = '1';
        b.style.display = i < msg.options.length ? 'flex' : 'none';
    });

    resetPowerUps();
    setPowerUpsDisabled(true);

    showScreen('player-quiz-screen');

    const gained = document.getElementById('player-gained');
    if (gained) gained.className = 'player-gained';

    startPotentialTimer(msg.timeLimit);
    startPlayerTimer(msg.timeLimit);
}

function startPotentialTimer(seconds) {
    if (potentialInterval) clearInterval(potentialInterval);
    potentialStartTime = Date.now();
    potentialDuration = seconds;
    const el = document.getElementById('player-potential');
    el.textContent = '1000';
    potentialInterval = setInterval(() => {
        const elapsed = (Date.now() - potentialStartTime) / 1000;
        const ratio = Math.max(0, Math.min(1, 1 - Math.pow(elapsed / potentialDuration, 2)));
        el.textContent = Math.round(1000 * ratio);
    }, 100);
}

function stopPotentialTimer() {
    if (potentialInterval) { clearInterval(potentialInterval); potentialInterval = null; }
}

function startPlayerTimer(seconds) {
    const fill = document.getElementById('player-timer-fill');
    fill.style.transition = 'none';
    fill.style.width = '100%';
    setTimeout(() => {
        fill.style.transition = `width ${seconds}s linear`;
        fill.style.width = '0%';
    }, 50);

    if (timerAnimation) clearTimeout(timerAnimation);
    timerAnimation = setTimeout(() => {
        if (isAnswering) {
            const btns = document.querySelectorAll('.player-option');
            btns.forEach(b => b.disabled = true);
        }
    }, seconds * 1000);
}

function playerSelect(index, btn) {
    if (!isAnswering) return;
    isAnswering = false;
    selectedAnswerIndex = index;
    if (window.sound) window.sound.play('click');

    const btns = document.querySelectorAll('.player-option');
    btns.forEach(b => b.disabled = true);

    btns.forEach(b => {
        if (b !== btn) {
            b.style.opacity = '0.3';
        }
    });
    btn.style.transform = 'scale(0.95)';

    setPowerUpsDisabled(true);

    ws.send(JSON.stringify({ type: 'submitAnswer', answerIndex: index }));
}

const POWER_UP_SHORT = {
    star: '⭐ x2 điểm',
    thunder: '⚡ Sấm sét',
    devil: '🌑 Ngôi sao đen',
    reduce: '🔍 2 đáp án',
    expand: '🌪️ Top 3 trên chọn 6 đáp án',
    shield: '🛡️ Khiên',
    earthquake: '🌍 Động đất',
    wizard: '🧙 Phù thủy',
    tornado: '🌪️ Cơn lốc',
};

function selectPowerUp(type) {
    if (isAnswering) return;
    if (powerUpsLeft[type] <= 0) return;
    if (selectedPowerUps.has(type)) selectedPowerUps.delete(type);
    else {
        selectedPowerUps.add(type);
        if (type === 'star' && selectedPowerUps.has('devil')) {
            selectedPowerUps.delete('devil');
            showToast('⭐ Ngôi sao hi vọng và 🌑 ngôi sao đen không thể dùng cùng lúc!');
        } else if (type === 'devil' && selectedPowerUps.has('star')) {
            selectedPowerUps.delete('star');
            showToast('🌑 Ngôi sao đen và ⭐ ngôi sao hi vọng không thể dùng cùng lúc!');
        }
    }

    const btns = {
        star: document.getElementById('pu-star'),
        thunder: document.getElementById('pu-thunder'),
        devil: document.getElementById('pu-devil'),
        reduce: document.getElementById('pu-reduce'),
        expand: document.getElementById('pu-expand'),
        shield: document.getElementById('pu-shield'),
        earthquake: document.getElementById('pu-earthquake'),
        wizard: document.getElementById('pu-wizard'),
        tornado: document.getElementById('pu-tornado'),
    };
    const hint = document.getElementById('powerup-hint');
    const isNowSelected = !selectedPowerUps.has(type);
    for (const key in btns) btns[key].classList.toggle('active', selectedPowerUps.has(key));
    if (window.sound) window.sound.play(isNowSelected ? 'select' : 'deselect');

    if (selectedPowerUps.size > 0) {
        const names = [...selectedPowerUps].map(k => POWER_UP_SHORT[k]).join(', ');
        hint.textContent = `Đã chọn: ${names}`;
    } else {
        hint.textContent = 'Chọn 1 hoặc nhiều item để dùng cho câu này';
    }

    ws.send(JSON.stringify({ type: 'selectPowerUp', powerUps: [...selectedPowerUps] }));
}

function resetPowerUps() {
    const btns = {
        star: document.getElementById('pu-star'),
        thunder: document.getElementById('pu-thunder'),
        devil: document.getElementById('pu-devil'),
        reduce: document.getElementById('pu-reduce'),
        expand: document.getElementById('pu-expand'),
        shield: document.getElementById('pu-shield'),
        earthquake: document.getElementById('pu-earthquake'),
        wizard: document.getElementById('pu-wizard'),
        tornado: document.getElementById('pu-tornado'),
    };
    const labels = {
        star: `⭐ x2 điểm${powerUpsLeft.star > 0 ? ` (${powerUpsLeft.star})` : ''}`,
        thunder: `⚡ Sấm sét${powerUpsLeft.thunder > 0 ? ` (${powerUpsLeft.thunder})` : ''}`,
        devil: `🌑 Ngôi sao đen${powerUpsLeft.devil > 0 ? ` (${powerUpsLeft.devil})` : ''}`,
        reduce: `🔍 2 đáp án${powerUpsLeft.reduce > 0 ? ` (${powerUpsLeft.reduce})` : ''}`,
        expand: `🌪️ 6 đáp án${powerUpsLeft.expand > 0 ? ` (${powerUpsLeft.expand})` : ''}`,
        shield: `🛡️ Khiên${powerUpsLeft.shield > 0 ? ` (${powerUpsLeft.shield})` : ''}`,
        earthquake: `🌍 Động đất${powerUpsLeft.earthquake > 0 ? ` (${powerUpsLeft.earthquake})` : ''}`,
        wizard: `🧙 Phù thủy${powerUpsLeft.wizard > 0 ? ` (${powerUpsLeft.wizard})` : ''}`,
        tornado: `🌪️ Cơn lốc${powerUpsLeft.tornado > 0 ? ` (${powerUpsLeft.tornado})` : ''}`,
    };
    const hint = document.getElementById('powerup-hint');
    for (const key in btns) {
        btns[key].classList.remove('active');
        btns[key].textContent = labels[key];
        btns[key].disabled = powerUpsLeft[key] <= 0;
    }
    hint.textContent = isAnswering ? '' : 'Chọn 1 hoặc nhiều item để dùng cho câu này';
}

function setPowerUpsDisabled(disabled) {
    const keys = ['star', 'thunder', 'devil', 'reduce', 'expand', 'shield', 'earthquake', 'wizard', 'tornado'];
    keys.forEach(k => {
        document.getElementById('pu-' + k).disabled = disabled || powerUpsLeft[k] <= 0;
    });
}

function showToast(text, ms = 2000) {
    const t = document.getElementById('player-toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

function clearFxLayer() {
    const layer = document.getElementById('fx-layer');
    if (layer) layer.innerHTML = '';
}

function spawnFx(html) {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    layer.insertAdjacentHTML('beforeend', html);
}

function fxStar() {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    const wrap = document.createElement('div');
    wrap.className = 'fx-star-wrap';
    wrap.innerHTML = `
        <div class="fx-star-rays"></div>
        <div class="fx-star-glow"></div>
        <div class="fx-star-core">⭐</div>
    `;
    for (let i = 0; i < 14; i++) {
        const p = document.createElement('div');
        p.className = 'fx-star-particle';
        const ang = Math.random() * Math.PI * 2;
        const dist = 90 + Math.random() * 150;
        p.style.setProperty('--dx', (Math.cos(ang) * dist) + 'px');
        p.style.setProperty('--dy', (Math.sin(ang) * dist) + 'px');
        p.style.animationDelay = (Math.random() * 0.6) + 's';
        wrap.appendChild(p);
    }
    layer.appendChild(wrap);
}

function fxThunder() {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    const wrap = document.createElement('div');
    wrap.className = 'fx-thunder-wrap';
    wrap.innerHTML = `
        <div class="fx-thunder-flash"></div>
        <div class="fx-thunder-bolt bolt-main"></div>
        <div class="fx-thunder-bolt bolt-side1"></div>
        <div class="fx-thunder-bolt bolt-side2"></div>
        <div class="fx-thunder-emblem">⚡</div>
    `;
    for (let i = 0; i < 10; i++) {
        const s = document.createElement('div');
        s.className = 'fx-thunder-spark';
        s.style.left = (15 + Math.random() * 70) + '%';
        s.style.top = (20 + Math.random() * 60) + '%';
        s.style.animationDelay = (Math.random() * 1.2) + 's';
        wrap.appendChild(s);
    }
    layer.appendChild(wrap);
}

function fxDevil() {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    const wrap = document.createElement('div');
    wrap.className = 'fx-devil-wrap';
    wrap.innerHTML = `
        <div class="fx-devil-dark"></div>
        <div class="fx-devil-ring r1"></div>
        <div class="fx-devil-ring r2"></div>
        <div class="fx-devil-smoke"></div>
        <div class="fx-devil-core">🌑</div>
    `;
    for (let i = 0; i < 7; i++) {
        const b = document.createElement('div');
        b.className = 'fx-devil-bat';
        b.textContent = '🦇';
        b.style.left = (Math.random() * 80 + 10) + '%';
        b.style.animationDuration = (Math.random() * 2 + 2.5) + 's';
        b.style.animationDelay = (Math.random() * 2) + 's';
        b.style.fontSize = (Math.random() * 14 + 18) + 'px';
        wrap.appendChild(b);
    }
    layer.appendChild(wrap);
}

function fxReduce() {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    const wrap = document.createElement('div');
    wrap.className = 'fx-reduce-wrap';
    wrap.innerHTML = `
        <div class="fx-reduce-scan"></div>
        <div class="fx-reduce-lens">🔍</div>
        <div class="fx-reduce-ring"></div>
    `;
    layer.appendChild(wrap);
}

function fxExpand() {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    const wrap = document.createElement('div');
    wrap.className = 'fx-expand-wrap';
    wrap.innerHTML = `
        <div class="fx-expand-fade"></div>
        <div class="fx-expand-tornado"></div>
        <div class="fx-expand-ring"></div>
        <div class="fx-expand-whirl">🌪️</div>
    `;
    for (let i = 0; i < 12; i++) {
        const w = document.createElement('div');
        w.className = 'fx-expand-wind';
        w.style.top = (Math.random() * 90 + 5) + '%';
        w.style.animationDelay = (Math.random() * 1.5) + 's';
        w.style.height = (Math.random() * 40 + 60) + 'px';
        wrap.appendChild(w);
    }
    layer.appendChild(wrap);
}

function fxShield() {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    const wrap = document.createElement('div');
    wrap.className = 'fx-shield-wrap';
    wrap.innerHTML = `
        <div class="fx-shield-dome"></div>
        <div class="fx-shield-hex"></div>
        <div class="fx-shield-core">🛡️</div>
    `;
    for (let i = 0; i < 10; i++) {
        const s = document.createElement('div');
        s.className = 'fx-shield-spark';
        s.style.left = (10 + Math.random() * 80) + '%';
        s.style.top = (15 + Math.random() * 70) + '%';
        s.style.animationDelay = (Math.random() * 2) + 's';
        wrap.appendChild(s);
    }
    layer.appendChild(wrap);
}

function fxShieldBlocked() {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    const wrap = document.createElement('div');
    wrap.className = 'fx-shield-block';
    wrap.innerHTML = `
        <div class="fx-shield-block-core">🛡️</div>
        <div class="fx-shield-block-bolt">⚡</div>
    `;
    layer.appendChild(wrap);
    document.body.classList.add('fx-shake');
    setTimeout(() => document.body.classList.remove('fx-shake'), 1200);
}

function clearAnswerFxLayer() {
    const layer = document.getElementById('answer-fx-layer');
    if (layer) layer.innerHTML = '';
}

function fxHappySun() {
    const layer = document.getElementById('answer-fx-layer');
    if (!layer) return;
    layer.innerHTML = '';
    layer.innerHTML = `
        <div class="fx-sun-wrap">
            <div class="fx-sun-rays"></div>
            <div class="fx-sun-core"></div>
        </div>`;
}

function fxSadRain() {
    const layer = document.getElementById('answer-fx-layer');
    if (!layer) return;
    layer.innerHTML = '';
    const rain = document.createElement('div');
    rain.className = 'fx-rain-wrap';
    rain.innerHTML = '<div class="fx-rain-cloud"><i class="fx-rain-bump"></i><i class="fx-rain-bump big"></i></div>';
    for (let i = 0; i < 42; i++) {
        const drop = document.createElement('div');
        drop.className = 'fx-rain-drop';
        drop.style.left = Math.random() * 100 + 'vw';
        drop.style.animationDuration = (Math.random() * 0.6 + 0.7) + 's';
        drop.style.animationDelay = (Math.random() * 1.4) + 's';
        drop.style.opacity = Math.random() * 0.5 + 0.35;
        rain.appendChild(drop);
    }
    layer.appendChild(rain);
}

function playPowerUpFx(type) {
    switch (type) {
        case 'star': fxStar(); break;
        case 'thunder': fxThunder(); break;
        case 'devil': fxDevil(); break;
        case 'reduce': fxReduce(); break;
        case 'expand': fxExpand(); break;
        case 'shield': fxShield(); break;
        case 'earthquake': fxEarthquakeCast(); break;
        case 'wizard': fxWizardCast(); break;
        case 'tornado': fxTornadoCast(); break;
    }
}

function clearQuestionDebuffs() {
    const screen = document.getElementById('player-quiz-screen');
    if (screen) screen.classList.remove('fx-quake-active');
    const opts = document.getElementById('player-options');
    if (opts) opts.classList.remove('wizard-blind');
}

function fxEarthquake() {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    clearFxLayer();
    const wrap = document.createElement('div');
    wrap.className = 'fx-quake-wrap';
    wrap.innerHTML = `
        <div class="fx-quake-vignette"></div>
        <div class="fx-quake-shock"></div>
        <div class="fx-quake-banner">🌍 ĐỘNG ĐẤT!</div>
        <div class="fx-quake-cracks"></div>
    `;
    for (let i = 0; i < 26; i++) {
        const dust = document.createElement('div');
        dust.className = 'fx-quake-dust';
        dust.style.left = Math.random() * 100 + 'vw';
        dust.style.animationDuration = (Math.random() * 1.2 + 0.8) + 's';
        dust.style.animationDelay = (Math.random() * 1.5) + 's';
        dust.style.transform = `scale(${Math.random() * 0.7 + 0.3})`;
        wrap.appendChild(dust);
    }
    layer.appendChild(wrap);
    const screen = document.getElementById('player-quiz-screen');
    if (screen) screen.classList.add('fx-quake-active');
    if (window.sound) window.sound.play('earthquake');
    showToast('🌍 ĐỘNG ĐẤT! Màn hình của bạn bị rung lắc — hãy cố tập trung!', 2600);
}

function fxWizard() {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    clearFxLayer();
    const wrap = document.createElement('div');
    wrap.className = 'fx-wizard-wrap';
    wrap.innerHTML = `
        <div class="fx-wizard-flash"></div>
        <div class="fx-wizard-mist"></div>
        <div class="fx-wizard-rune ring1"></div>
        <div class="fx-wizard-rune ring2"></div>
        <div class="fx-wizard-eye">🧙</div>
        <div class="fx-wizard-banner">🧙 PHÙ THỦY ĐÃ CHE KHUẤT ĐÁP ÁN!</div>
    `;
    for (let i = 0; i < 14; i++) {
        const rune = document.createElement('div');
        rune.className = 'fx-wizard-rune-char';
        rune.textContent = ['✦', '✧', '☾', '✺', '⬡', '✶', '♆', '✦'][i % 8];
        rune.style.left = (Math.random() * 90 + 5) + '%';
        rune.style.animationDuration = (Math.random() * 2.4 + 2) + 's';
        rune.style.animationDelay = (Math.random() * 2) + 's';
        rune.style.fontSize = (Math.random() * 18 + 14) + 'px';
        wrap.appendChild(rune);
    }
    layer.appendChild(wrap);
    if (window.sound) window.sound.play('wizard');
}

function fxEarthquakeCast() {
    spawnFx('<div class="fx-quake-cast">🌍</div>');
}

function fxWizardCast() {
    spawnFx('<div class="fx-wizard-cast">🧙</div>');
}

function fxTornado() {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    clearFxLayer();
    const wrap = document.createElement('div');
    wrap.className = 'fx-tornado-wrap';
    wrap.innerHTML = `
        <div class="fx-tornado-funnel"></div>
        <div class="fx-tornado-core">🌪️</div>
        <div class="fx-tornado-banner">🌪️ CƠN LỐC ĐÃ CUỐN BAY ĐÁP ÁN!</div>
    `;
    for (let i = 0; i < 22; i++) {
        const debris = document.createElement('div');
        debris.className = 'fx-tornado-debris';
        debris.textContent = ['🍃', '🍂', '📄', '❓', '📃', '🌿'][i % 6];
        debris.style.left = Math.random() * 100 + '%';
        debris.style.animationDuration = (Math.random() * 1.4 + 0.9) + 's';
        debris.style.animationDelay = (Math.random() * 1.6) + 's';
        debris.style.fontSize = (Math.random() * 18 + 16) + 'px';
        wrap.appendChild(debris);
    }
    layer.appendChild(wrap);
    if (window.sound) window.sound.play('tornado');
}

function fxTornadoCast() {
    spawnFx('<div class="fx-tornado-cast">🌪️</div>');
}

function onEarthquakeHit(msg) {
    fxEarthquake();
    if (msg.byName) showToast(`🌍 ${msg.byName} gây động đất — bạn đang trong top 10 bị rung lắc!`, 2600);
}

function onWizardHit(msg) {
    fxWizard();
    if (msg.byName) showToast(`🧙 ${msg.byName} dùng phù thủy — câu hỏi của bạn đã bị đổi sang câu khác!`, 2600);
}

function onTornadoHit(msg) {
    document.getElementById('player-options').classList.add('wizard-blind');
    fxTornado();
    if (msg.byName) showToast(`🌪️ ${msg.byName} gây cơn lốc — đáp án của bạn đã bị cuốn bay hết!`, 2600);
}

function onScoreHit(msg) {
    currentScore = msg.score;
    const el = document.getElementById('player-score');
    if (el) el.textContent = msg.score;
    fxThunder();
    if (window.sound) window.sound.play('scoreHit');
    showToast(`⚡ ${msg.byName} dùng sấm sét — bạn bị trừ ${msg.amount} điểm!`);
}

function onAnswerResult(msg) {
    currentScore = msg.score;
    lastGained = msg.gained;
    stopPotentialTimer();
    document.getElementById('player-score').textContent = msg.score;

    if (msg.correct) {
        fxHappySun();
    } else {
        fxSadRain();
    }

    const gained = document.getElementById('player-gained');
    if (msg.gained > 0) {
        gained.textContent = `+${msg.gained}`;
        gained.className = 'player-gained show';
        setTimeout(() => { gained.className = 'player-gained'; }, 1600);
        if (window.sound) window.sound.play('correct');
    } else {
        if (window.sound) window.sound.play('wrong');
    }

    if (msg.powerUpsRemaining) {
        powerUpsLeft = { ...msg.powerUpsRemaining };
        resetPowerUps();
    }

    if (msg.powerUps && msg.powerUps.length > 0) {
        msg.powerUps.forEach(pu => {
            if (pu === 'star' && msg.gained > 0) {
                if (window.sound) window.sound.play('star');
                showToast('⭐ Ngôi sao hi vọng: điểm x2!');
            } else if (pu === 'devil') {
                if (window.sound) window.sound.play('devil');
                if (msg.correct) showToast(`🌑 Ngôi sao đen: được ${msg.gained} điểm!`);
                else showToast('🌑 Ngôi sao đen: sai — bạn bị trừ 3500 điểm!');
            } else if (pu === 'thunder') {
                if (window.sound) window.sound.play('thunder');
                if (msg.correct) {
                    const n = msg.thunderHits ? msg.thunderHits.length : 0;
                    const b = msg.thunderBlocked ? msg.thunderBlocked.length : 0;
                    if (n > 0) showToast(`⚡ Sấm sét đánh người trên 1 hạng — họ bị trừ 400 điểm!`);
                    else if (b > 0) showToast('⚡ Bị 🛡️ khiên chặn! Không trừ được điểm');
                    else showToast('⚡ Bạn đang đứng nhất — không có ai phía trên để đánh');
                } else {
                    showToast('⚡ Trả lời sai — bạn bị trừ 400 điểm!');
                }
            } else if (pu === 'reduce') {
                if (window.sound) window.sound.play('reduce');
                showToast('🔍 Câu này bạn chỉ có 2 đáp án!');
            } else if (pu === 'expand') {
                if (window.sound) window.sound.play('expand');
                showToast('🌪️ Top 3 người đứng trên bạn phải chọn 6 đáp án!');
            } else if (pu === 'shield') {
                if (window.sound) window.sound.play('shield');
                showToast('🛡️ Khiên đã bật — câu này không bị trừ điểm!');
            } else if (pu === 'earthquake') {
                if (window.sound) window.sound.play('earthquake');
                showToast('🌍 Động đất: top 10 đang phải chịu rung lắc!');
            } else if (pu === 'wizard') {
                if (window.sound) window.sound.play('wizard');
                showToast('🧙 Phù thủy: top 3 bị đổi sang câu hỏi khác với 5 đáp án, sai trừ 500 điểm!');
            } else if (pu === 'tornado') {
                if (window.sound) window.sound.play('tornado');
                showToast('🌪️ Cơn lốc: top 3 bị cuốn bay hết đáp án!');
            }
        });
    }
}

function onShieldBlocked(msg) {
    fxShieldBlocked();
    if (window.sound) window.sound.play('shieldBlocked');
    showToast(`🛡️ Khiên của bạn đã chặn ⚡ sấm sét của ${msg.byName}!`);
}

function onShowAnswer(msg) {
    isAnswering = false;

    const btns = document.querySelectorAll('.player-option');
    const correctBtn = btns[msg.correctIndex];
    correctBtn.classList.add('opt-correct');
    correctBtn.style.opacity = '1';

    if (selectedAnswerIndex !== -1 && selectedAnswerIndex !== msg.correctIndex) {
        btns[selectedAnswerIndex].classList.add('opt-wrong');
    }

    setTimeout(() => {
        showScreen('player-result-screen');

        document.getElementById('player-result-icon').textContent = '📊';
        document.getElementById('player-result-title').textContent = 'Kết quả';
        document.getElementById('player-result-score').textContent = `+${lastGained} điểm`;
        document.getElementById('player-result-total-score').textContent = currentScore;
        document.getElementById('player-result-waiting').textContent = '';

        const lbContent = document.getElementById('player-lb-content');
        lbContent.innerHTML = '';
        msg.leaderboard.forEach((p, i) => {
            const row = document.createElement('div');
            row.className = 'plb-row';
            const medals = ['🥇', '🥈', '🥉'];
            const isMe = p.id === playerId;
            row.innerHTML = `
                <span class="plb-pos">${i < 3 ? medals[i] : `#${p.position}`}</span>
                <span class="plb-name ${isMe ? 'plb-me' : ''}">${escapeHtml(p.name)}</span>
                <span class="plb-score">${p.score}</span>
            `;
            lbContent.appendChild(row);
        });
        document.getElementById('player-leaderboard').style.display = 'block';
    }, 1500);
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 28; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        const size = (Math.random() * 4 + 2) + 'px';
        p.style.width = size;
        p.style.height = size;
        p.style.animationDuration = (Math.random() * 8 + 7) + 's';
        p.style.animationDelay = (Math.random() * 8) + 's';
        container.appendChild(p);
    }
}

function onGameFinished(msg) {
    showScreen('player-final-screen');

    document.getElementById('final-stat-score').textContent = msg.myScore;
    document.getElementById('final-stat-correct').textContent = msg.correctAnswers;
    document.getElementById('final-stat-wrong').textContent = msg.wrongAnswers;

    const rank = msg.myPosition;
    const total = msg.totalPlayers;
    document.getElementById('final-rank-badge').textContent = `#${rank}`;

    const pct = Math.round((rank / total) * 100);
    let icon = '🏆';
    if (pct <= 10) icon = '🏆';
    else if (pct <= 30) icon = '🎖️';
    else if (pct <= 50) icon = '🌟';
    else icon = '💪';
    document.getElementById('final-trophy').textContent = icon;

    const lbContent = document.getElementById('player-final-lb');
    lbContent.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    msg.finalLeaderboard.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'plb-row final-row';
        const isMe = p.id === playerId;
        row.innerHTML = `
            <span class="plb-pos">${i < 3 ? medals[i] : `#${p.position}`}</span>
            <span class="plb-name ${isMe ? 'plb-me' : ''}">${escapeHtml(p.name)}</span>
            <span class="plb-score">${p.score}</span>
        `;
        lbContent.appendChild(row);
    });

    const thankYou = document.querySelector('.thank-you-message');
    if (thankYou) thankYou.style.display = 'block';
}

function joinGame() {
    const nameInput = document.getElementById('name-input');
    const codeInput = document.getElementById('code-input');
    const name = nameInput.value.trim();
    if (!name) return;
    if (window.sound) window.sound.play('click');

    gameCode = (codeInput.value || '').trim().toUpperCase();
    if (!gameCode) {
        showError('Vui lòng nhập mã phòng!');
        return;
    }

    playerName = name;
    const btn = document.getElementById('join-btn');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Đang kết nối...';

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'joinGame', gameCode, playerName }));
    } else {
        connect();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    const nameInput = document.getElementById('name-input');
    const codeInput = document.getElementById('code-input');
    const joinBtn = document.getElementById('join-btn');
    const charCount = document.getElementById('char-count');

    function updateJoinState() {
        const nameOk = nameInput.value.trim().length >= 1;
        const codeOk = codeInput.value.trim().length === 6;
        joinBtn.disabled = !(nameOk && codeOk);
    }

    nameInput.addEventListener('input', () => {
        charCount.textContent = nameInput.value.length + '/20';
        updateJoinState();
    });

    codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        updateJoinState();
    });

    function tryJoin() {
        if (!joinBtn.disabled) {
            joinGame();
        }
    }

    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') tryJoin();
    });

    codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') tryJoin();
    });

    joinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tryJoin();
    });

    if (gameCode) {
        nameInput.focus();
    } else {
        codeInput.focus();
    }

    updateJoinState();
    connect();
});
