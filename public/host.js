let ws = null;
let gameCode = null;
let totalQuestions = 0;
let currentQuestion = -1;
let timerInterval = null;
let isShowingAnswer = false;

function connect() {
    ws = new WebSocket(`ws://${window.location.host}`);
    ws.onopen = () => { createGame(); };
    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
            case 'gameCreated': onGameCreated(msg); break;
            case 'playerJoined': onPlayerJoined(msg); break;
            case 'playerLeft': onPlayerLeft(msg); break;
            case 'hostNewQuestion': onHostNewQuestion(msg); break;
            case 'playerAnswered': onPlayerAnswered(msg); break;
            case 'hostQuestionResult': onHostQuestionResult(msg); break;
            case 'gameFinished': onGameFinished(msg); break;
        }
    };
    ws.onclose = () => {
        setTimeout(connect, 1000);
    };
}

function createGame() {
    ws.send(JSON.stringify({ type: 'createGame' }));
}

function onGameCreated(msg) {
    gameCode = msg.gameCode;
    totalQuestions = msg.totalQuestions;
    document.getElementById('game-code').textContent = gameCode;
    loadQR(gameCode);
}

function loadQR(code) {
    fetch(`/api/qr?code=${code}`)
        .then(r => r.text())
        .then(dataUrl => {
            document.getElementById('qr-container').innerHTML = `<img src="${dataUrl}" alt="QR Code" class="qr-image">`;
        });
}

function onPlayerJoined(msg) {
    document.getElementById('player-count').textContent = msg.count;
    document.getElementById('player-count-badge').textContent = msg.count;

    const list = document.getElementById('player-list');
    if (msg.count === 1) list.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'player-item';
    div.id = `player-${msg.playerId}`;
    div.innerHTML = `<span class="player-avatar">${getAvatar(msg.playerName)}</span><span class="player-name">${escapeHtml(msg.playerName)}</span>`;
    list.appendChild(div);

    const btn = document.getElementById('btn-start-game');
    btn.disabled = false;
}

function onPlayerLeft(msg) {
    document.getElementById('player-count').textContent = msg.count;
    document.getElementById('player-count-badge').textContent = msg.count;

    const el = document.getElementById(`player-${msg.playerId}`);
    if (el) el.remove();

    if (msg.count === 0) {
        document.getElementById('player-list').innerHTML = '<div class="empty-players">Đợi người chơi tham gia...</div>';
        document.getElementById('btn-start-game').disabled = true;
    }
}

function getAvatar(name) {
    const emojis = ['🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🦄', '🐲', '🐶', '🐱', '🐭', '🐹', '🐰', '🦝', '🐻', '🐧', '🐤', '🐴', '🦋'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) { hash = ((hash << 5) - hash) + name.charCodeAt(i); hash |= 0; }
    return emojis[Math.abs(hash) % emojis.length];
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function startGame() {
    ws.send(JSON.stringify({ type: 'startGame' }));
}

function onHostNewQuestion(msg) {
    isShowingAnswer = false;
    currentQuestion = msg.questionIndex;

    document.getElementById('host-progress').textContent = `${msg.questionIndex + 1}/${msg.totalQuestions}`;
    document.getElementById('host-player-count').textContent = msg.totalPlayers;
    document.getElementById('answered-count').textContent = '0';
    document.getElementById('total-count').textContent = msg.totalPlayers;
    document.getElementById('host-question-number').textContent = `Câu ${msg.questionIndex + 1}`;
    document.getElementById('host-question-text').textContent = msg.text;

    const pct = Math.round((msg.questionIndex / msg.totalQuestions) * 100);
    document.getElementById('host-progress-bar').style.width = pct + '%';
    document.getElementById('host-progress-percent').textContent = pct + '%';

    const optionsDiv = document.getElementById('host-options');
    optionsDiv.innerHTML = '';
    optionsDiv.style.display = 'grid';
    const letters = ['A', 'B', 'C', 'D'];
    const colors = ['#e53e3e', '#3182ce', '#d69e2e', '#38a169'];
    msg.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn option-btn-host';
        btn.id = `host-opt-${i}`;
        btn.innerHTML = `<span class="option-letter" style="background:${colors[i]}">${letters[i]}</span><span class="option-text">${opt}</span>`;
        optionsDiv.appendChild(btn);
    });

    document.getElementById('host-result-area').style.display = 'none';
    document.getElementById('host-next-btn').style.display = 'none';

    startHostTimer(msg.timeLimit);

    showScreen('quiz-screen');
}

function startHostTimer(seconds) {
    let remaining = seconds;
    const circle = document.getElementById('host-timer-circle');
    const ring = document.getElementById('host-timer-ring');
    const num = document.getElementById('host-timer-number');
    const circumference = 264;

    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = 0;
    circle.classList.remove('warning');

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        remaining--;
        num.textContent = remaining;
        const offset = circumference * (1 - remaining / seconds);
        ring.style.strokeDashoffset = offset;

        if (remaining <= 5) circle.classList.add('warning');
        if (remaining <= 0) { clearInterval(timerInterval); timerInterval = null; }
    }, 1000);
}

function onPlayerAnswered(msg) {
    document.getElementById('answered-count').textContent = msg.answeredCount;
}

function onHostQuestionResult(msg) {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    const optionsDiv = document.getElementById('host-options');
    const correctIndex = msg.correctIndex;

    document.querySelectorAll('#host-options .option-btn').forEach((btn, i) => {
        if (i === correctIndex) btn.classList.add('correct');
    });

    const resultArea = document.getElementById('host-result-area');
    resultArea.style.display = 'block';
    resultArea.style.animation = 'slideIn 0.5s ease';

    const dist = document.getElementById('answer-distribution');
    dist.innerHTML = '<div class="dist-title">Phân bố câu trả lời</div>';
    const letters = ['A', 'B', 'C', 'D'];
    const colors = ['#e53e3e', '#3182ce', '#d69e2e', '#38a169'];
    const maxVal = Math.max(...msg.answerDistribution, 1);
    msg.answerDistribution.forEach((count, i) => {
        const bar = document.createElement('div');
        bar.className = `dist-bar ${i === correctIndex ? 'dist-correct' : ''}`;
        bar.innerHTML = `
            <span class="dist-letter" style="background:${colors[i]}">${letters[i]}</span>
            <div class="dist-track"><div class="dist-fill" style="width:${(count / maxVal) * 100}%;background:${colors[i]}"></div></div>
            <span class="dist-count">${count}</span>
        `;
        dist.appendChild(bar);
    });

    const lb = document.getElementById('mini-leaderboard');
    lb.innerHTML = '';
    msg.leaderboard.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = `lb-row ${i < 3 ? 'lb-top' : ''}`;
        const medals = ['🥇', '🥈', '🥉'];
        row.innerHTML = `
            <span class="lb-pos">${i < 3 ? medals[i] : `#${p.position}`}</span>
            <span class="lb-name">${escapeHtml(p.name)}</span>
            <span class="lb-score">${p.score}</span>
        `;
        lb.appendChild(row);
    });

    const nextBtn = document.getElementById('host-next-btn');
    nextBtn.style.display = 'flex';
    if (msg.questionIndex >= totalQuestions - 1) {
        document.getElementById('host-next-text').textContent = 'Xem kết quả';
    } else {
        document.getElementById('host-next-text').textContent = 'Câu tiếp theo';
    }
}

function hostNextQuestion() {
    ws.send(JSON.stringify({ type: 'nextQuestion' }));
}

function onGameFinished(msg) {
    showScreen('final-screen');

    const top10 = msg.finalLeaderboard;
    const podium = document.getElementById('podium');
    podium.innerHTML = '';

    if (top10.length > 0) {
        const order = top10.length >= 3 ? [1, 0, 2] : [0];
        const medals = ['🥇', '🥈', '🥉'];
        const heights = [180, 140, 100];
        const podiumDiv = document.createElement('div');
        podiumDiv.className = 'podium-steps';

        order.forEach(i => {
            if (i < top10.length) {
                const p = top10[i];
                const step = document.createElement('div');
                step.className = `podium-step ${i === 0 ? 'first' : i === 1 ? 'second' : 'third'}`;
                step.innerHTML = `
                    <div class="podium-avatar">${getAvatar(p.name)}</div>
                    <div class="podium-name">${escapeHtml(p.name)}</div>
                    <div class="podium-medal">${medals[i] || ''}</div>
                    <div class="podium-score">${p.score} điểm</div>
                    <div class="podium-bar" style="height:${heights[i]}px"></div>
                `;
                podiumDiv.appendChild(step);
            }
        });
        podium.appendChild(podiumDiv);
    }

    const list = document.getElementById('final-leaderboard-list');
    list.innerHTML = '<h3>Top 10</h3>';
    const medals = ['🥇', '🥈', '🥉'];
    top10.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'lb-row final-lb-row';
        row.innerHTML = `
            <span class="lb-pos">${i < 3 ? medals[i] : `#${p.position}`}</span>
            <span class="lb-name">${escapeHtml(p.name)}</span>
            <span class="lb-correct">✅ ${p.correctAnswers}</span>
            <span class="lb-score">${p.score}</span>
        `;
        list.appendChild(row);
    });

    document.getElementById('final-icon').textContent = '🏆';
}

function hostEndGame() {
    if (confirm('Kết thúc trò chơi ngay bây giờ?')) {
        ws.send(JSON.stringify({ type: 'endGame' }));
    }
}

function resetGame() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
    gameCode = null;
    currentQuestion = -1;
    document.getElementById('player-list').innerHTML = '<div class="empty-players">Đợi người chơi tham gia...</div>';
    document.getElementById('player-count').textContent = '0';
    document.getElementById('player-count-badge').textContent = '0';
    document.getElementById('btn-start-game').disabled = true;
    document.getElementById('game-code').textContent = '------';
    document.getElementById('qr-container').innerHTML = '<div class="qr-loading">Đang tạo QR...</div>';
    showScreen('lobby-screen');
    setTimeout(connect, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    connect();

    document.getElementById('btn-copy-code').addEventListener('click', () => {
        if (gameCode) {
            navigator.clipboard.writeText(gameCode).then(() => {
                const btn = document.getElementById('btn-copy-code');
                btn.textContent = 'Đã sao chép!';
                setTimeout(() => { btn.textContent = 'Sao chép mã'; }, 2000);
            });
        }
    });
});
