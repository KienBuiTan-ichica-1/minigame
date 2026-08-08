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
let powerUpsLeft = { star: 2, thunder: 1, devil: 1, reduce: 1, expand: 1, shield: 1 };

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

    document.getElementById('player-phase-banner').style.display = 'none';
    document.getElementById('player-options').style.opacity = '1';

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
    };

function selectPowerUp(type) {
    if (isAnswering) return;
    if (powerUpsLeft[type] <= 0) return;
    if (selectedPowerUps.has(type)) selectedPowerUps.delete(type);
    else selectedPowerUps.add(type);

    const btns = {
        star: document.getElementById('pu-star'),
        thunder: document.getElementById('pu-thunder'),
        devil: document.getElementById('pu-devil'),
        reduce: document.getElementById('pu-reduce'),
        expand: document.getElementById('pu-expand'),
        shield: document.getElementById('pu-shield'),
    };
    const hint = document.getElementById('powerup-hint');
    for (const key in btns) btns[key].classList.toggle('active', selectedPowerUps.has(key));

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
    };
    const labels = {
        star: `⭐ x2 điểm${powerUpsLeft.star > 0 ? ` (${powerUpsLeft.star})` : ''}`,
        thunder: `⚡ Sấm sét${powerUpsLeft.thunder > 0 ? ` (${powerUpsLeft.thunder})` : ''}`,
        devil: `🌑 Ngôi sao đen${powerUpsLeft.devil > 0 ? ` (${powerUpsLeft.devil})` : ''}`,
        reduce: `🔍 2 đáp án${powerUpsLeft.reduce > 0 ? ` (${powerUpsLeft.reduce})` : ''}`,
        expand: `🌪️ 6 đáp án${powerUpsLeft.expand > 0 ? ` (${powerUpsLeft.expand})` : ''}`,
        shield: `🛡️ Khiên${powerUpsLeft.shield > 0 ? ` (${powerUpsLeft.shield})` : ''}`,
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
    const keys = ['star', 'thunder', 'devil', 'reduce', 'expand', 'shield'];
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

function onScoreHit(msg) {
    currentScore = msg.score;
    const el = document.getElementById('player-score');
    if (el) el.textContent = msg.score;
    showToast(`⚡ ${msg.byName} dùng sấm sét — bạn bị trừ ${msg.amount} điểm!`);
}

function onAnswerResult(msg) {
    currentScore = msg.score;
    lastGained = msg.gained;
    stopPotentialTimer();
    document.getElementById('player-score').textContent = msg.score;

    const gained = document.getElementById('player-gained');
    if (msg.gained > 0) {
        gained.textContent = `+${msg.gained}`;
        gained.className = 'player-gained show';
        setTimeout(() => { gained.className = 'player-gained'; }, 1600);
    }

    if (msg.powerUpsRemaining) {
        powerUpsLeft = { ...msg.powerUpsRemaining };
        resetPowerUps();
    }

    if (msg.powerUps && msg.powerUps.length > 0) {
        msg.powerUps.forEach(pu => {
            if (pu === 'star' && msg.gained > 0) {
                showToast('⭐ Ngôi sao hi vọng: điểm x2!');
            } else if (pu === 'devil') {
                if (msg.correct) showToast(`🌑 Ngôi sao đen: được ${msg.gained} điểm!`);
                else showToast('🌑 Ngôi sao đen: sai — bạn bị trừ 3500 điểm!');
            } else if (pu === 'thunder') {
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
                showToast('🔍 Câu này bạn chỉ có 2 đáp án!');
            } else if (pu === 'expand') {
                showToast('🌪️ Top 3 người đứng trên bạn phải chọn 6 đáp án!');
            } else if (pu === 'shield') {
                showToast('🛡️ Khiên đã bật — câu này không bị trừ điểm!');
            }
        });
    }
}

function onShieldBlocked(msg) {
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
