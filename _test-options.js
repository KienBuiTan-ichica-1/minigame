const WebSocket = require('ws');
const questions = require('./questions');

const players = {};
let gameCode = null;

function correctByText(q, options) {
    return options.findIndex(t => t === q.a[q.c]);
}

function connect(name, id, plan) {
    const ws = new WebSocket('ws://localhost:3000');
    players[id] = { ws, name, plan };
    ws.on('open', () => ws.send(JSON.stringify({ type: 'joinGame', gameCode, playerName: name })));
    ws.on('message', (raw) => {
        const msg = JSON.parse(raw);
        if (msg.type === 'joined') {
            console.log(`${name} joined → theme=${msg.theme}`);
        }
        if (msg.type === 'themeChanged') {
            console.log(`${name} themeChanged → theme=${msg.theme}`);
        }
        if (msg.type === 'powerUpPhase') {
            const qi = msg.questionIndex;
            const mine = plan[qi];
            const powerUps = mine && mine.pu ? (Array.isArray(mine.pu) ? mine.pu : [mine.pu]) : [];
            console.log(`${name} Q${qi}: chọn item ${JSON.stringify(powerUps)} (còn ${JSON.stringify(msg.powerUps)})`);
            ws.send(JSON.stringify({ type: 'selectPowerUp', powerUps }));
        }
        if (msg.type === 'newQuestion') {
            const qi = msg.questionIndex;
            console.log(`${name} Q${qi}: options=${msg.options.length} ${msg.options.join(' | ')}`);
            const mine = plan[qi];
            const localCorrect = correctByText(questions[qi], msg.options);
            let answerIndex = localCorrect;
            if (mine && mine.pickFake) answerIndex = 4;
            if (mine && mine.answer != null) answerIndex = mine.answer;
            setTimeout(() => ws.send(JSON.stringify({ type: 'submitAnswer', answerIndex })), 150);
        }
        if (msg.type === 'answerResult') {
            console.log(`${name}: gained=${msg.gained} correct=${msg.correct} powerUps=${JSON.stringify(msg.powerUps)} remaining=${JSON.stringify(msg.powerUpsRemaining)}`);
        }
        if (msg.type === 'scoreHit') {
            console.log(`${name} ⚡ SCORE HIT -${msg.amount} by ${msg.byName}, new score=${msg.score}`);
        }
    });
    return ws;
}

(async () => {
    const host = new WebSocket('ws://localhost:3000');
    host.on('message', (raw) => {
        const msg = JSON.parse(raw);
        if (msg.type === 'gameCreated') {
            gameCode = msg.gameCode;
            host.send(JSON.stringify({ type: 'setTheme', theme: 'dark' }));
            connect('P_A', 0, { 0: { pu: 'reduce' }, 1: null, 2: { pu: 'shield' } });
            connect('P_B', 1, { 0: null, 1: null, 2: { pu: null, pickFake: true } });
            connect('P_C', 2, { 0: null, 1: { pu: 'expand' }, 2: null });
        }
        if (msg.type === 'playerJoined' && msg.count === 3) {
            host.send(JSON.stringify({ type: 'setTheme', theme: 'pink' }));
            host.send(JSON.stringify({ type: 'startGame' }));
        }
        if (msg.type === 'hostQuestionResult') {
            console.log('hostQuestionResult Q' + msg.questionIndex, '| dist:', msg.answerDistribution.join(','), '|', msg.leaderboard.map(p => `${p.name}:${p.score}`).join(' '));
            if (msg.questionIndex >= 2) process.exit(0);
            host.send(JSON.stringify({ type: 'nextQuestion' }));
        }
    });
    host.on('open', () => host.send(JSON.stringify({ type: 'createGame' })));
    setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 40000);
})();
