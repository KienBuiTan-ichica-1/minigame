(function () {
    'use strict';

    const THEMES = {
        pink: { name: 'Pink Beauty', icon: '🌸', char: '🦄', font: 'Quicksand', swatches: ['#ec4899', '#f472b6', '#fbcfe8'] },
        lavender: { name: 'Lavender', icon: '💜', char: '🧚', font: 'Poppins', swatches: ['#8b5cf6', '#a78bfa', '#c4b5fd'] },
        nature: { name: 'Nature', icon: '🌿', char: '🐻', font: 'Nunito', swatches: ['#16a34a', '#65a30d', '#a3e635'] },
        dark: { name: 'Dark Beauty', icon: '🌙', char: '🦇', font: 'Space Grotesk', swatches: ['#6366f1', '#c084fc', '#22d3ee'] },
        luxury: { name: 'Luxury Gold', icon: '✨', char: '👑', font: 'Playfair Display', swatches: ['#b8860b', '#d4af37', '#f5c842'] },
    };

    const DEFAULT_THEME = 'lavender';
    const STORAGE_KEY = 'xhcsk-theme';
    const isPlayer = document.body.classList.contains('player-body');

    function currentTheme() {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    }

    function applyTheme(name, { syncHost = false } = {}) {
        const theme = THEMES[name] ? name : DEFAULT_THEME;
        document.body.dataset.theme = theme;

        const fab = document.getElementById('theme-fab');
        if (fab) fab.textContent = THEMES[theme].icon;

        document.title = THEMES[theme].name + ' — Quiz Game';

        document.querySelectorAll('[data-theme-char]').forEach((node) => {
            node.textContent = THEMES[theme].char;
            node.classList.remove('mascot-pop');
            void node.offsetWidth;
            node.classList.add('mascot-pop');
            clearTimeout(node._popTimer);
            node._popTimer = setTimeout(() => node.classList.remove('mascot-pop'), 750);
        });

        document.querySelectorAll('.theme-card').forEach((card) => {
            card.classList.toggle('active', card.dataset.theme === theme);
        });

        const timerGradient = document.getElementById('timerGradient');
        if (timerGradient) {
            const style = getComputedStyle(document.body);
            const primary = style.getPropertyValue('--primary').trim() || '#667eea';
            const accent = style.getPropertyValue('--accent').trim() || '#f093fb';
            const stops = timerGradient.querySelectorAll('stop');
            if (stops[0]) stops[0].setAttribute('stop-color', primary);
            if (stops[1]) stops[1].setAttribute('stop-color', accent);
        }

        if (syncHost && !isPlayer && window.ws && window.ws.readyState === 1) {
            window.ws.send(JSON.stringify({ type: 'setTheme', theme }));
        }
        return theme;
    }

    function selectTheme(name) {
        localStorage.setItem(STORAGE_KEY, name);
        applyTheme(name, { syncHost: true });
    }

    function buildPicker() {
        const grid = document.getElementById('theme-grid');
        if (!grid) return;
        grid.innerHTML = '';
        Object.keys(THEMES).forEach((key) => {
            const t = THEMES[key];
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'theme-card';
            card.dataset.theme = key;
            card.onclick = () => selectTheme(key);
            card.innerHTML =
                '<span class="theme-card-char">' + t.char + '</span>' +
                '<span class="theme-card-name">' + t.name + '</span>' +
                '<span class="theme-card-font">' + t.font + '</span>' +
                '<span class="theme-swatches">' +
                t.swatches.map(c => '<span style="background:' + c + '"></span>').join('') +
                '</span>';
            grid.appendChild(card);
        });
    }

    window.theme = {
        themes: THEMES,
        current: currentTheme,
        apply: applyTheme,
        select: selectTheme,
        isPlayer,
    };

    window.selectTheme = selectTheme;
    window.toggleThemeModal = function () {
        document.getElementById('theme-modal').classList.toggle('show');
    };
    window.closeThemeModal = function (e) {
        const m = document.getElementById('theme-modal');
        if (!e || e.target === m) m.classList.remove('show');
    };

    document.addEventListener('DOMContentLoaded', () => {
        buildPicker();
        applyTheme(currentTheme());
    });
})();
