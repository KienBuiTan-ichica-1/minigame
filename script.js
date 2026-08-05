let currentQuestion = 0;
let score = 0;
let correctAnswers = 0;
let wrongAnswers = 0;
const totalQuestions = questions.length;
const maxScore = totalQuestions * 10;

// ==================== AUDIO SYSTEM ====================
let audioCtx = null;
let bgMusicPlaying = false;
let bgMusicInterval = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone(frequency, duration, type = 'sine', volume = 0.25) {
    initAudio();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
}

function playClick() {
    playTone(880, 0.08, 'sine', 0.4);
    setTimeout(() => playTone(1100, 0.06, 'sine', 0.3), 40);
}

function playCorrect() {
    playTone(523, 0.12, 'sine', 0.5);
    setTimeout(() => playTone(659, 0.12, 'sine', 0.5), 80);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.5), 160);
    setTimeout(() => playTone(1047, 0.2, 'sine', 0.55), 240);
}

function playWrong() {
    playTone(200, 0.25, 'sawtooth', 0.4);
    setTimeout(() => playTone(150, 0.3, 'sawtooth', 0.35), 120);
}

function playWarning() {
    playTone(880, 0.08, 'square', 0.3);
}

function playTimeUp() {
    playTone(440, 0.15, 'sawtooth', 0.45);
    setTimeout(() => playTone(350, 0.15, 'sawtooth', 0.4), 120);
    setTimeout(() => playTone(260, 0.25, 'sawtooth', 0.35), 240);
}

function playVictory() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((note, i) => {
        setTimeout(() => playTone(note, 0.2, 'sine', 0.5), i * 100);
    });
}

function startBgMusic() {
    initAudio();
    if (bgMusicPlaying) return;
    bgMusicPlaying = true;
    
    const melodyNotes = [
        392, 440, 523, 587, 523, 440, 392, 330,
        349, 392, 440, 523, 440, 392, 349, 330,
        294, 330, 349, 392, 349, 330, 294, 262,
        330, 349, 392, 440, 392, 349, 330, 294
    ];
    let noteIndex = 0;
    
    function playNextNote() {
        if (!bgMusicPlaying) return;
        playTone(melodyNotes[noteIndex], 0.35, 'sine', 0.15);
        playTone(melodyNotes[noteIndex] / 2, 0.35, 'triangle', 0.1);
        noteIndex = (noteIndex + 1) % melodyNotes.length;
    }
    
    playNextNote();
    bgMusicInterval = setInterval(playNextNote, 400);
}

function stopBgMusic() {
    bgMusicPlaying = false;
    if (bgMusicInterval) {
        clearInterval(bgMusicInterval);
        bgMusicInterval = null;
    }
}

function toggleBgMusic() {
    initAudio();
    const btn = document.getElementById('music-btn');
    const waves = document.getElementById('music-waves');
    const icon = btn.querySelector('.music-icon');
    
    if (bgMusicPlaying) {
        stopBgMusic();
        icon.textContent = '🔇';
        waves.classList.remove('active');
    } else {
        startBgMusic();
        icon.textContent = '🔊';
        waves.classList.add('active');
    }
    playClick();
}

// ==================== PARTICLES ====================
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 40; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.width = (Math.random() * 6 + 3) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

// ==================== EFFECTS ====================
function createStars(x, y) {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#48bb78', '#f6ad55'];
    for (let i = 0; i < 8; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.textContent = ['✨', '⭐', '💫', '🌟'][Math.floor(Math.random() * 4)];
        star.style.left = x + 'px';
        star.style.top = y + 'px';
        star.style.fontSize = (Math.random() * 15 + 15) + 'px';
        document.body.appendChild(star);
        setTimeout(() => star.remove(), 800);
    }
}

function createConfetti() {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#48bb78', '#f6ad55', '#fc8181', '#ffd700', '#00ff88'];
    for (let i = 0; i < 60; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 4500);
        }, i * 40);
    }
}

function createFirework(x, y) {
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d', '#c084fc'];
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            z-index: 9999;
        `;
        document.body.appendChild(particle);
        const angle = (i / particleCount) * Math.PI * 2;
        const velocity = 80 + Math.random() * 120;
        const targetX = x + Math.cos(angle) * velocity;
        const targetY = y + Math.sin(angle) * velocity;
        particle.animate([
            { left: x + 'px', top: y + 'px', opacity: 1, transform: 'scale(1)' },
            { left: targetX + 'px', top: targetY + 'px', opacity: 0, transform: 'scale(0)' }
        ], { duration: 800 + Math.random() * 400, easing: 'cubic-bezier(0, 0.9, 0.57, 1)' });
        setTimeout(() => particle.remove(), 1200);
    }
}

function launchFireworks(count) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const x = Math.random() * w * 0.6 + w * 0.2;
            const y = Math.random() * h * 0.5 + h * 0.1;
            createFirework(x, y);
        }, i * 300);
    }
}

function animateScoreCounter(elementId, targetValue, duration) {
    const el = document.getElementById(elementId);
    const start = performance.now();
    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * targetValue);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function flashScreen() {
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed; inset: 0; z-index: 10000;
        background: white; pointer-events: none; opacity: 0.8;
    `;
    document.body.appendChild(flash);
    flash.animate([
        { opacity: 0.8 },
        { opacity: 0 }
    ], { duration: 600, easing: 'ease-out' });
    setTimeout(() => flash.remove(), 700);
}

// ==================== GAME LOGIC ====================
document.getElementById('question-count').textContent = totalQuestions;

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function startQuiz() {
    playClick();
    startBgMusic();
    
    currentQuestion = 0;
    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    showScreen('quiz-screen');
    showQuestion();
}

function showQuestion() {
    const q = questions[currentQuestion];
    
    document.getElementById('progress').textContent = `${currentQuestion + 1}/${totalQuestions}`;
    document.getElementById('score-display').textContent = score;
    document.getElementById('question-number').textContent = `Câu ${currentQuestion + 1}`;
    document.getElementById('question-text').textContent = q.q;
    document.getElementById('feedback').textContent = '';
    document.getElementById('feedback').className = 'feedback-container';
    document.getElementById('next-btn').style.display = 'none';
    
    const progressPercent = Math.round((currentQuestion / totalQuestions) * 100);
    document.getElementById('progress-bar').style.width = progressPercent + '%';
    document.getElementById('progress-percent').textContent = progressPercent + '%';
    
    const optionsDiv = document.getElementById('options');
    optionsDiv.innerHTML = '';
    
    const letters = ['A', 'B', 'C', 'D'];
    q.a.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `
            <span class="option-letter">${letters[index]}</span>
            <span class="option-text">${option}</span>
        `;
        btn.onclick = (e) => selectAnswer(index, btn, e);
        optionsDiv.appendChild(btn);
    });
}

function selectAnswer(index, btn, event) {
    playClick();
    
    if (event) {
        createStars(event.clientX, event.clientY);
    }
    
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => b.disabled = true);
    
    const correct = questions[currentQuestion].c;
    
    if (index === correct) {
        playCorrect();
        btn.classList.add('correct');
        score += 10;
        correctAnswers++;
        document.getElementById('feedback').innerHTML = '🎉 Chính xác! Tuyệt vời! +10 điểm';
        document.getElementById('feedback').className = 'feedback-container correct';
    } else {
        playWrong();
        btn.classList.add('wrong');
        buttons[correct].classList.add('correct');
        wrongAnswers++;
        document.getElementById('feedback').innerHTML = '😔 Sai rồi! Đáp án đúng đã được hiển thị.';
        document.getElementById('feedback').className = 'feedback-container wrong';
    }
    
    document.getElementById('score-display').textContent = score;
    document.getElementById('next-btn').style.display = 'block';
}

function highlightCorrect() {
    const buttons = document.querySelectorAll('.option-btn');
    buttons[questions[currentQuestion].c].classList.add('correct');
}

function nextQuestion() {
    playClick();
    currentQuestion++;
    if (currentQuestion < totalQuestions) {
        showQuestion();
    } else {
        showResult();
    }
}

function showResult() {
    stopBgMusic();
    
    document.getElementById('music-waves').classList.remove('active');
    document.querySelector('.music-icon').textContent = '🔇';
    
    showScreen('result-screen');
    
    const percent = Math.round((score / maxScore) * 100);
    
    document.getElementById('score-max').textContent = `/${maxScore}`;
    document.getElementById('correct-count').textContent = '0';
    document.getElementById('wrong-count').textContent = '0';
    document.getElementById('accuracy').textContent = '0%';
    document.getElementById('final-score').textContent = '0';
    
    animateScoreCounter('final-score', score, 1500);
    
    setTimeout(() => {
        const el = document.getElementById('correct-count');
        const s = performance.now();
        (function u(now) {
            const p = Math.min((now - s) / 800, 1);
            el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * correctAnswers);
            if (p < 1) requestAnimationFrame(u);
        })(performance.now());
    }, 400);
    
    setTimeout(() => {
        const el = document.getElementById('wrong-count');
        const s = performance.now();
        (function u(now) {
            const p = Math.min((now - s) / 800, 1);
            el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * wrongAnswers);
            if (p < 1) requestAnimationFrame(u);
        })(performance.now());
    }, 600);
    
    setTimeout(() => {
        const el = document.getElementById('accuracy');
        const s = performance.now();
        (function u(now) {
            const p = Math.min((now - s) / 1000, 1);
            el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * percent) + '%';
            if (p < 1) requestAnimationFrame(u);
        })(performance.now());
    }, 800);
    
    const scoreRing = document.getElementById('score-ring-fill');
    const circumference = 534;
    const offset = circumference * (1 - score / maxScore);
    setTimeout(() => {
        scoreRing.style.strokeDashoffset = offset;
    }, 300);
    
    let message = '';
    let icon = '';
    if (percent === 100) {
        message = '🏆 Hoàn hảo! Bạn là thiên tài! Điểm số tuyệt đối!';
        icon = '🏆';
        playVictory();
        flashScreen();
        createConfetti();
        setTimeout(createConfetti, 400);
        setTimeout(createConfetti, 800);
        launchFireworks(8);
        setTimeout(() => launchFireworks(5), 1000);
    } else if (percent >= 80) {
        message = '🌟 Xuất sắc! Kiến thức vững vàng!';
        icon = '🌟';
        playVictory();
        flashScreen();
        createConfetti();
        setTimeout(createConfetti, 500);
        launchFireworks(5);
    } else if (percent >= 60) {
        message = '👍 Khá tốt! Tiếp tục cố gắng!';
        icon = '💪';
        playTone(523, 0.15, 'sine', 0.45);
        setTimeout(() => playTone(659, 0.2, 'sine', 0.45), 120);
        createConfetti();
        launchFireworks(3);
    } else if (percent >= 40) {
        message = '📚 Cần ôn bài kỹ hơn! Đừng bỏ cuộc!';
        icon = '📖';
        playTone(440, 0.2, 'sine', 0.4);
        setTimeout(() => playTone(392, 0.25, 'sine', 0.4), 150);
    } else {
        message = '💪 Đừng nản lòng, hãy cố gắng lần sau!';
        icon = '🎯';
        playTone(330, 0.2, 'triangle', 0.4);
    }
    
    document.getElementById('result-message').textContent = message;
    document.getElementById('result-icon').textContent = icon;
    
    const resultContent = document.querySelector('.result-content');
    resultContent.style.opacity = '0';
    resultContent.style.transform = 'translateY(30px)';
    setTimeout(() => {
        resultContent.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
        resultContent.style.opacity = '1';
        resultContent.style.transform = 'translateY(0)';
    }, 100);
}

function endQuizNow() {
    playClick();
    showResult();
}

function restartQuiz() {
    playClick();
    const scoreRing = document.getElementById('score-ring-fill');
    scoreRing.style.transition = 'none';
    scoreRing.style.strokeDashoffset = 534;
    setTimeout(() => { scoreRing.style.transition = ''; }, 50);
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('progress-percent').textContent = '0%';
    document.getElementById('final-score').textContent = '0';
    document.getElementById('correct-count').textContent = '0';
    document.getElementById('wrong-count').textContent = '0';
    document.getElementById('accuracy').textContent = '0%';
    document.querySelector('.result-content').style.transition = 'none';
    showScreen('start-screen');
}

// Initialize
createParticles();
