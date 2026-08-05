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
            case 'gameStarted': onGameStarted(msg); break;
            case 'newQuestion': onNewQuestion(msg); break;
            case 'answerResult': onAnswerResult(msg); break;
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
    showScreen('waiting-screen');
}

function onGameStarted(msg) {
    showScreen('player-quiz-screen');
}

function onNewQuestion(msg) {
    isAnswering = true;
    selectedAnswerIndex = -1;
    currentScore = msg.questionIndex === 0 ? 0 : currentScore;

    document.getElementById('player-question-num').textContent = `${msg.questionIndex + 1}/${msg.totalQuestions}`;
    document.getElementById('player-score').textContent = currentScore;
    document.getElementById('player-question-badge').textContent = `Câu ${msg.questionIndex + 1}`;
    document.getElementById('player-question-text').textContent = msg.text;

    const opts = ['opt-text-0', 'opt-text-1', 'opt-text-2', 'opt-text-3'];
    msg.options.forEach((opt, i) => {
        document.getElementById(opts[i]).textContent = opt;
    });

    const btns = document.querySelectorAll('.player-option');
    btns.forEach(b => {
        b.disabled = false;
        b.className = 'player-option ' + b.classList[1];
        b.style.transform = '';
        b.style.opacity = '1';
    });

    showScreen('player-quiz-screen');

    const gained = document.getElementById('player-gained');
    if (gained) gained.className = 'player-gained';

    startPlayerTimer(msg.timeLimit);
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

    const btns = document.querySelectorAll('.player-option');
    btns.forEach(b => b.disabled = true);

    btns.forEach(b => {
        if (b !== btn) {
            b.style.opacity = '0.3';
        }
    });
    btn.style.transform = 'scale(0.95)';

    ws.send(JSON.stringify({ type: 'submitAnswer', answerIndex: index }));
}

function onAnswerResult(msg) {
    currentScore = msg.score;
    lastGained = msg.gained;
    document.getElementById('player-score').textContent = msg.score;

    const gained = document.getElementById('player-gained');
    if (msg.gained > 0) {
        gained.textContent = `+${msg.gained}`;
        gained.className = 'player-gained show';
        setTimeout(() => { gained.className = 'player-gained'; }, 1600);
    }
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
