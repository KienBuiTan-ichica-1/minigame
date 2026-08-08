(function () {
    'use strict';

    let ctx = null;
    let master = null;
    let musicGain = null;
    let sfxGain = null;
    let musicTimer = null;
    let musicStep = 0;
    let nextNoteTime = 0;
    let isMusicOn = true;
    let isSfxOn = true;
    const STORAGE_KEY = 'xhcsk-sound';

    function init() {
        if (ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 1;
        master.connect(ctx.destination);
        musicGain = ctx.createGain();
        musicGain.gain.value = 0.16;
        musicGain.connect(master);
        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.55;
        sfxGain.connect(master);
    }

    function resume() {
        init();
        if (ctx && ctx.state === 'suspended') ctx.resume();
        if (isMusicOn) startMusic();
    }

    function noteFreq(n) {
        return 440 * Math.pow(2, (n - 69) / 12);
    }

    function tone(freq, dur, type, gainVal, when, dest) {
        if (!ctx) return;
        const t = when || ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gainVal || 0.3, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g);
        g.connect(dest || sfxGain);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    }

    function noise(dur, filterFreq, gainVal, type, when) {
        if (!ctx) return;
        const t = when || ctx.currentTime;
        const len = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const f = ctx.createBiquadFilter();
        f.type = type || 'lowpass';
        f.frequency.value = filterFreq || 1000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(gainVal || 0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(f);
        f.connect(g);
        g.connect(sfxGain);
        src.start(t);
        src.stop(t + dur + 0.05);
    }

    const SOUNDS = {
        click() {
            tone(660, 0.08, 'triangle', 0.2);
        },
        select() {
            tone(523, 0.09, 'sine', 0.25);
            setTimeout(() => tone(784, 0.12, 'sine', 0.25), 90);
        },
        deselect() {
            tone(400, 0.09, 'sine', 0.22);
        },
        correct() {
            tone(523, 0.15, 'sine', 0.3);
            setTimeout(() => tone(659, 0.15, 'sine', 0.3), 120);
            setTimeout(() => tone(784, 0.25, 'sine', 0.32), 240);
            setTimeout(() => tone(1047, 0.35, 'sine', 0.3), 380);
        },
        wrong() {
            tone(220, 0.2, 'sawtooth', 0.2);
            setTimeout(() => tone(180, 0.3, 'sawtooth', 0.2), 150);
        },
        star() {
            [60, 64, 67, 72, 76, 79].forEach((n, i) => {
                setTimeout(() => tone(noteFreq(n), 0.2, 'sine', 0.3), i * 70);
            });
        },
        thunder() {
            noise(0.5, 1200, 0.5, 'lowpass');
            setTimeout(() => noise(0.7, 600, 0.45, 'lowpass'), 120);
            setTimeout(() => tone(80, 0.5, 'sawtooth', 0.35), 60);
            setTimeout(() => tone(55, 0.7, 'sine', 0.4), 200);
        },
        devil() {
            tone(160, 0.4, 'sawtooth', 0.35);
            setTimeout(() => tone(110, 0.5, 'sawtooth', 0.35), 150);
            setTimeout(() => tone(70, 0.7, 'square', 0.3), 300);
            noise(0.6, 800, 0.35, 'lowpass');
        },
        reduce() {
            tone(500, 0.12, 'sine', 0.25);
            setTimeout(() => tone(650, 0.12, 'sine', 0.25), 100);
            setTimeout(() => tone(800, 0.15, 'sine', 0.25), 200);
        },
        expand() {
            [60, 55, 50, 45].forEach((n, i) => {
                setTimeout(() => tone(noteFreq(n), 0.3, 'triangle', 0.28), i * 110);
            });
        },
        shield() {
            tone(300, 0.4, 'sine', 0.25);
            setTimeout(() => tone(450, 0.4, 'sine', 0.25), 200);
            setTimeout(() => tone(600, 0.6, 'sine', 0.22), 400);
        },
        shieldBlocked() {
            tone(500, 0.15, 'square', 0.25);
            setTimeout(() => tone(380, 0.25, 'square', 0.2), 120);
            setTimeout(() => tone(600, 0.2, 'sine', 0.25), 300);
        },
        earthquake() {
            noise(0.9, 200, 0.6, 'lowpass');
            setTimeout(() => noise(1.0, 150, 0.6, 'lowpass'), 250);
            setTimeout(() => noise(1.2, 120, 0.55, 'lowpass'), 550);
            setTimeout(() => noise(0.8, 300, 0.5, 'lowpass'), 900);
            setTimeout(() => tone(45, 1.4, 'sine', 0.5), 50);
            setTimeout(() => tone(36, 1.8, 'sine', 0.45), 400);
            setTimeout(() => tone(32, 1.6, 'sine', 0.4), 800);
        },
        wizard() {
            [72, 76, 79, 84, 88, 96].forEach((n, i) => {
                setTimeout(() => tone(noteFreq(n), 0.5, 'sine', 0.3), i * 90);
            });
            noise(0.8, 4000, 0.22, 'highpass');
            setTimeout(() => tone(noteFreq(72), 0.4, 'triangle', 0.28), 550);
            setTimeout(() => tone(noteFreq(88), 0.6, 'triangle', 0.28), 700);
        },
        tornado() {
            noise(1.1, 300, 0.5, 'bandpass');
            setTimeout(() => noise(1.2, 400, 0.45, 'bandpass'), 200);
            setTimeout(() => noise(1.4, 500, 0.4, 'bandpass'), 450);
            setTimeout(() => tone(70, 1.3, 'sine', 0.35), 80);
            setTimeout(() => tone(52, 1.6, 'sine', 0.3), 400);
        },
        scoreHit() {
            SOUNDS.thunder();
        },
        tick() {
            tone(880, 0.05, 'square', 0.12);
        },
        timeUp() {
            tone(440, 0.3, 'sawtooth', 0.3);
            setTimeout(() => tone(330, 0.4, 'sawtooth', 0.3), 250);
        },
        countdown() {
            tone(660, 0.1, 'sine', 0.25);
        },
        celebrate() {
            [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => {
                setTimeout(() => tone(noteFreq(n), 0.35, 'triangle', 0.32), i * 110);
            });
            setTimeout(() => noise(0.8, 3000, 0.2, 'highpass'), 500);
            setTimeout(() => tone(noteFreq(84), 0.6, 'triangle', 0.3), 800);
        },
        join() {
            tone(523, 0.12, 'sine', 0.25);
            setTimeout(() => tone(659, 0.12, 'sine', 0.25), 100);
            setTimeout(() => tone(784, 0.2, 'sine', 0.25), 200);
        },
        leave() {
            tone(523, 0.12, 'sine', 0.2);
            setTimeout(() => tone(392, 0.2, 'sine', 0.2), 100);
        },
        start() {
            tone(523, 0.15, 'square', 0.25);
            setTimeout(() => tone(659, 0.15, 'square', 0.25), 120);
            setTimeout(() => tone(784, 0.3, 'square', 0.28), 240);
        },
        powerupReady() {
            tone(784, 0.1, 'sine', 0.22);
            setTimeout(() => tone(988, 0.14, 'sine', 0.22), 100);
        },
    };

    function play(name) {
        init();
        if (!ctx) return;
        if (!isSfxOn && name !== 'click') return;
        if (ctx.state === 'suspended') ctx.resume();
        const fn = SOUNDS[name];
        if (fn) fn();
    }

    /* ---------- Nhạc nền ---------- */
    const MELODY = [
        60, 64, 67, 72, 67, 64, 62, 67, 71, 74, 71, 67,
        60, 64, 67, 72, 76, 74, 72, 67, 65, 60,
        55, 59, 62, 67, 62, 59, 57, 62, 65, 69, 65, 62,
        60, 64, 67, 72, 76, 74, 72, 67, 69, 67,
    ];
    const BASS = [
        36, 36, 36, 36, 31, 31, 31, 31,
        36, 36, 36, 36, 33, 33, 33, 33,
        31, 31, 31, 31, 29, 29, 29, 29,
        36, 36, 36, 36, 33, 33, 31, 31,
    ];
    const STEP = 0.24;

    function scheduleNote(step) {
        const m = MELODY[step % MELODY.length];
        const b = BASS[Math.floor(step / 2) % BASS.length];
        const isAccent = step % 2 === 0;
        tone(noteFreq(m), STEP * 1.8, isAccent ? 'triangle' : 'sine', isAccent ? 0.16 : 0.11, nextNoteTime, musicGain);
        if (step % 2 === 0) {
            tone(noteFreq(b - 12), STEP * 3.5, 'sine', 0.14, nextNoteTime, musicGain);
        }
    }

    function startMusic() {
        if (!ctx || !isMusicOn) return;
        if (musicTimer) return;
        nextNoteTime = ctx.currentTime + 0.1;
        musicStep = 0;
        musicTimer = setInterval(() => {
            while (nextNoteTime < ctx.currentTime + 0.5) {
                scheduleNote(musicStep);
                nextNoteTime += STEP;
                musicStep++;
            }
        }, 60);
    }

    function stopMusic() {
        if (musicTimer) {
            clearInterval(musicTimer);
            musicTimer = null;
        }
    }

    function setMusic(on) {
        isMusicOn = !!on;
        if (isMusicOn) startMusic();
        else stopMusic();
    }

    function setSfx(on) {
        isSfxOn = !!on;
    }

    function toggleMusic() {
        setMusic(!isMusicOn);
        return isMusicOn;
    }

    function toggleSfx() {
        setSfx(!isSfxOn);
        return isSfxOn;
    }

    function initSettings() {
        try {
            const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            isMusicOn = s.music !== false;
            isSfxOn = s.sfx !== false;
        } catch (e) { }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ music: isMusicOn, sfx: isSfxOn }));
        } catch (e) { }
    }

    window.sound = {
        init,
        resume,
        play,
        setMusic,
        setSfx,
        toggleMusic,
        toggleSfx,
        startMusic,
        stopMusic,
        get musicOn() { return isMusicOn; },
        get sfxOn() { return isSfxOn; },
        saveSettings,
        initSettings,
    };

    window.toggleSound = function () {
        init();
        const music = toggleMusic();
        toggleSfx();
        saveSettings();
        syncSoundFab(music);
        if (music) {
            sound.play('start');
            sound.play('select');
        }
    };

    function syncSoundFab(musicOn) {
        const fab = document.getElementById('sound-fab');
        if (!fab) return;
        fab.textContent = musicOn ? '🔊' : '🔇';
        fab.classList.toggle('off', !musicOn);
    }

    initSettings();
    syncSoundFab(isMusicOn);

    document.addEventListener('DOMContentLoaded', () => {
        const start = () => { resume(); };
        document.addEventListener('click', start, { once: true });
        document.addEventListener('touchstart', start, { once: true });
        document.addEventListener('keydown', start, { once: true });
    });
})();
