const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const os = require('os');

function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return 'localhost';
}

let cachedPublicURL = '';

function getPublicBaseURL() {
    if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
    if (cachedPublicURL) return cachedPublicURL;
    const localIP = getLocalIP();
    return `http://${localIP}:${PORT}`;
}

function getPlayerURL(gameCode) {
    return `${getPublicBaseURL()}/player.html?game=${gameCode}`;
}

function detectNgrokURL() {
    const httpMod = require('http');
    const req = httpMod.get('http://127.0.0.1:4040/api/tunnels', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.tunnels && json.tunnels.length > 0) {
                    cachedPublicURL = json.tunnels[0].public_url;
                    console.log(`🌐 Phát hiện ngrok: ${cachedPublicURL}`);
                }
            } catch (e) { }
        });
    });
    req.on('error', () => { });
    req.setTimeout(2000, () => { req.destroy(); });
}

setInterval(detectNgrokURL, 15000);
detectNgrokURL();

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
};

const questions = require('./questions');

const games = new Map();

const BASE_POINTS = 10;
const MAX_POINTS_PER_QUESTION = 20;

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];

    if (url === '/api/url') {
        const gameCode = new URL(req.url, 'http://localhost').searchParams.get('code');
        if (!gameCode || !games.has(gameCode)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(getPlayerURL(gameCode));
        return;
    }

    if (url === '/api/qr') {
        const gameCode = new URL(req.url, 'http://localhost').searchParams.get('code');
        if (!gameCode || !games.has(gameCode)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
        }
        const playerUrl = getPlayerURL(gameCode);
        QRCode.toDataURL(playerUrl, { width: 300, margin: 2, color: { dark: '#2d3748', light: '#ffffff' } }, (err, dataUrl) => {
            if (err) {
                res.writeHead(500);
                res.end('Error');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(dataUrl);
        });
        return;
    }

    if (url === '/api/questions') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(questions.map(q => ({ q: q.q, a: q.a }))));
        return;
    }

    let filePath = url === '/' ? path.join(PUBLIC_DIR, 'host.html') : path.join(PUBLIC_DIR, url);
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

const wss = new WebSocket.Server({ server });

function broadcast(gameCode, type, data, excludeWs = null) {
    const game = games.get(gameCode);
    if (!game) return;
    const msg = JSON.stringify({ type, ...data });
    if (game.host && game.host.readyState === WebSocket.OPEN && game.host !== excludeWs) {
        game.host.send(msg);
    }
    for (const [, player] of game.players) {
        if (player.ws.readyState === WebSocket.OPEN && player.ws !== excludeWs) {
            player.ws.send(msg);
        }
    }
}

function broadcastToPlayers(gameCode, type, data) {
    const game = games.get(gameCode);
    if (!game) return;
    const msg = JSON.stringify({ type, ...data });
    for (const [, player] of game.players) {
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(msg);
        }
    }
}

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch (e) { return; }

        switch (msg.type) {
            case 'createGame': createGame(ws); break;
            case 'joinGame': joinGame(ws, msg); break;
            case 'startGame': startGame(ws); break;
            case 'submitAnswer': submitAnswer(ws, msg); break;
            case 'nextQuestion': nextQuestion(ws); break;
            case 'endGame': endGame(ws); break;
        }
    });

    ws.on('close', () => {
        let gameCode = null;
        for (const [code, g] of games) {
            if (g.host === ws) { gameCode = code; break; }
            for (const [id, p] of g.players) {
                if (p.ws === ws) {
                    g.players.delete(id);
                    if (g.host && g.host.readyState === WebSocket.OPEN) {
                        g.host.send(JSON.stringify({ type: 'playerLeft', count: g.players.size, playerId: id }));
                    }
                    return;
                }
            }
        }
        if (gameCode) {
            const g = games.get(gameCode);
            if (g) {
                if (g.timerTimeout) clearTimeout(g.timerTimeout);
                games.delete(gameCode);
            }
        }
    });
});

function createGame(ws) {
    let gameCode;
    do { gameCode = generateCode(); } while (games.has(gameCode));

    const game = {
        code: gameCode,
        host: ws,
        players: new Map(),
        currentQuestion: -1,
        state: 'lobby',
        questionStartTime: null,
        answeredCount: 0,
        timerDuration: 20,
        timerTimeout: null,
    };
    games.set(gameCode, game);

    ws.send(JSON.stringify({
        type: 'gameCreated',
        gameCode,
        totalQuestions: questions.length,
    }));
}

function joinGame(ws, msg) {
    const { gameCode, playerName } = msg;
    const game = games.get(gameCode);
    if (!game) { ws.send(JSON.stringify({ type: 'error', message: 'Mã phòng không tồn tại!' })); return; }
    if (game.state !== 'lobby') { ws.send(JSON.stringify({ type: 'error', message: 'Trò chơi đã bắt đầu!' })); return; }
    if (game.players.size >= 150) { ws.send(JSON.stringify({ type: 'error', message: 'Phòng đã đầy!' })); return; }
    if (!playerName || playerName.trim().length === 0) { ws.send(JSON.stringify({ type: 'error', message: 'Vui lòng nhập tên!' })); return; }

    const id = generateId();
    const player = { id, name: playerName.trim(), ws, score: 0, correctAnswers: 0, wrongAnswers: 0, answers: [], joinedAt: Date.now() };
    game.players.set(id, player);
    player.ws = ws;

    ws.send(JSON.stringify({ type: 'joined', id, gameCode, playerName: player.name, totalQuestions: questions.length }));

    game.host.send(JSON.stringify({ type: 'playerJoined', count: game.players.size, playerId: id, playerName: player.name }));
}

function startGame(ws) {
    const game = findGameByHost(ws);
    if (!game || game.state !== 'lobby') return;
    game.state = 'playing';
    game.currentQuestion = -1;

    broadcastToPlayers(game.code, 'gameStarted', { totalQuestions: questions.length });
    setTimeout(() => sendQuestion(game), 1000);
}

function sendQuestion(game) {
    game.currentQuestion++;
    if (game.currentQuestion >= questions.length) { finishGame(game); return; }
    game.state = 'playing';
    game.answeredCount = 0;
    game.questionStartTime = Date.now();

    const q = questions[game.currentQuestion];
    broadcastToPlayers(game.code, 'newQuestion', {
        questionIndex: game.currentQuestion,
        totalQuestions: questions.length,
        text: q.q,
        options: q.a,
        timeLimit: game.timerDuration,
    });

    game.host.send(JSON.stringify({
        type: 'hostNewQuestion',
        questionIndex: game.currentQuestion,
        totalQuestions: questions.length,
        text: q.q,
        options: q.a,
        timeLimit: game.timerDuration,
        totalPlayers: game.players.size,
    }));

    if (game.timerTimeout) clearTimeout(game.timerTimeout);
    game.timerTimeout = setTimeout(() => showCorrectAnswer(game), game.timerDuration * 1000);
}

function submitAnswer(ws, msg) {
    const playerId = findPlayerId(ws);
    const game = findGameByPlayer(ws);
    if (!game || !playerId || game.state !== 'playing') return;

    const player = game.players.get(playerId);
    if (player.answers[game.currentQuestion] !== undefined) return;

    const correct = msg.answerIndex === questions[game.currentQuestion].c;
    player.answers[game.currentQuestion] = msg.answerIndex;
    game.answeredCount++;

    let gained = 0;
    if (correct) {
        const elapsedSeconds = (Date.now() - (game.questionStartTime || Date.now())) / 1000;
        const speedRatio = Math.max(0, Math.min(1, 1 - elapsedSeconds / game.timerDuration));
        gained = BASE_POINTS + Math.round((MAX_POINTS_PER_QUESTION - BASE_POINTS) * speedRatio);
        player.score += gained;
        player.correctAnswers++;
    } else {
        player.wrongAnswers++;
    }

    ws.send(JSON.stringify({ type: 'answerResult', correct, correctIndex: questions[game.currentQuestion].c, score: player.score, gained }));

    game.host.send(JSON.stringify({ type: 'playerAnswered', answeredCount: game.answeredCount, totalCount: game.players.size }));

    if (game.answeredCount >= game.players.size) {
        if (game.timerTimeout) clearTimeout(game.timerTimeout);
        showCorrectAnswer(game);
    }
}

function showCorrectAnswer(game) {
    if (game.state === 'showingAnswer') return;
    game.state = 'showingAnswer';

    const q = questions[game.currentQuestion];
    const leaderboard = buildLeaderboard(game);
    const top10 = leaderboard.slice(0, 10);

    broadcastToPlayers(game.code, 'showAnswer', {
        correctIndex: q.c,
        leaderboard: top10,
        totalPlayers: game.players.size,
    });

    game.host.send(JSON.stringify({
        type: 'hostQuestionResult',
        questionIndex: game.currentQuestion,
        correctIndex: q.c,
        leaderboard: top10,
        answerDistribution: getAnswerDistribution(game, game.currentQuestion),
        answeredCount: game.answeredCount,
        totalCount: game.players.size,
    }));
}

function nextQuestion(ws) {
    const game = findGameByHost(ws);
    if (!game || game.state === 'finished') return;
    if (game.currentQuestion >= questions.length - 1) { finishGame(game); return; }
    sendQuestion(game);
}

function finishGame(game) {
    game.state = 'finished';
    if (game.timerTimeout) clearTimeout(game.timerTimeout);

    const leaderboard = buildLeaderboard(game);
    const top10 = leaderboard.slice(0, 10);

    for (const [, player] of game.players) {
        if (player.ws.readyState === WebSocket.OPEN) {
            const position = leaderboard.findIndex(p => p.id === player.id) + 1;
            player.ws.send(JSON.stringify({
                type: 'gameFinished',
                finalLeaderboard: top10,
                myScore: player.score,
                correctAnswers: player.correctAnswers,
                wrongAnswers: player.wrongAnswers,
                totalQuestions: questions.length,
                myPosition: position,
                totalPlayers: game.players.size,
            }));
        }
    }

    game.host.send(JSON.stringify({
        type: 'gameFinished',
        finalLeaderboard: top10,
        totalPlayers: game.players.size,
    }));
}

function endGame(ws) {
    const game = findGameByHost(ws);
    if (!game) return;
    finishGame(game);
}

function buildLeaderboard(game) {
    const players = Array.from(game.players.values());
    players.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.joinedAt - b.joinedAt;
    });
    return players.map((p, i) => ({
        id: p.id, name: p.name, score: p.score,
        correctAnswers: p.correctAnswers, wrongAnswers: p.wrongAnswers,
        position: i + 1,
    }));
}

function getAnswerDistribution(game, questionIndex) {
    const dist = [0, 0, 0, 0];
    for (const [, player] of game.players) {
        const answer = player.answers[questionIndex];
        if (answer !== undefined) dist[answer]++;
    }
    return dist;
}

function findGameByHost(ws) {
    for (const [, game] of games) { if (game.host === ws) return game; }
    return null;
}

function findGameByPlayer(ws) {
    for (const [, game] of games) {
        for (const [, player] of game.players) { if (player.ws === ws) return game; }
    }
    return null;
}

function findPlayerId(ws) {
    for (const [, game] of games) {
        for (const [id, player] of game.players) { if (player.ws === ws) return id; }
    }
    return null;
}

const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => clearInterval(interval));

server.listen(PORT, () => {
    const localIP = getLocalIP();
    console.log(`\n==============================`);
    console.log(`✅ Server đang chạy!`);
    console.log(`==============================`);
    console.log(`📺 Màn hình Host:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://${localIP}:${PORT}`);
    console.log(`📱 Điện thoại cùng mạng truy cập:`);
    console.log(`   http://${localIP}:${PORT}/player.html`);
    if (process.env.PUBLIC_URL) {
        console.log(`🌐 Link công khai (mọi thiết bị mọi mạng):`);
        console.log(`   ${process.env.PUBLIC_URL}/player.html`);
    } else if (process.env.NGROK_URL) {
        console.log(`📱 Điện thoại mạng khác (qua ngrok):`);
        console.log(`   ${process.env.NGROK_URL}/player.html`);
    }
    console.log(`==============================\n`);
});
