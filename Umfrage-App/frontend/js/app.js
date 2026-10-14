'use strict';

/* ── Hilfsfunktionen ─────────────────────────────────────────── */

function showAlert(container, message, type = 'error') {
    container.innerHTML = `<div class="alert alert--${type}">${escapeHtml(message)}</div>`;
}

function clearAlert(container) {
    container.innerHTML = '';
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function getToken() {
    return localStorage.getItem('vl_token');
}

function setToken(token) {
    localStorage.setItem('vl_token', token);
}

function clearAuth() {
    localStorage.removeItem('vl_token');
    localStorage.removeItem('vl_user');
}

function getUser() {
    try { return JSON.parse(localStorage.getItem('vl_user')); } catch { return null; }
}

function setUser(user) {
    localStorage.setItem('vl_user', JSON.stringify(user));
}

async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

/* ── WebSocket-Wrapper ───────────────────────────────────────── */
class LiveSocket {
    constructor(sessionId, role, handlers = {}) {
        this.sessionId = sessionId;
        this.role      = role;
        this.handlers  = handlers;
        this.ws        = null;
        this._reconnectTimer = null;
        this._dead = false;
        this._connect();
    }

    _connect() {
        const proto = location.protocol === 'https:' ? 'wss' : 'ws';
        this.ws = new WebSocket(`${proto}://${location.host}`);

        this.ws.addEventListener('open', () => {
            this.ws.send(JSON.stringify({ type: 'JOIN', sessionId: this.sessionId, role: this.role }));
            if (this.handlers.onConnect) this.handlers.onConnect();
        });

        this.ws.addEventListener('message', (ev) => {
            let msg;
            try { msg = JSON.parse(ev.data); } catch { return; }
            if (msg.type === 'PONG') return;
            if (this.handlers[msg.type]) this.handlers[msg.type](msg);
            if (this.handlers.onMessage) this.handlers.onMessage(msg);
        });

        this.ws.addEventListener('close', () => {
            if (this._dead) return;
            if (this.handlers.onDisconnect) this.handlers.onDisconnect();
            this._reconnectTimer = setTimeout(() => this._connect(), 3000);
        });

        this.ws.addEventListener('error', () => this.ws.close());
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    destroy() {
        this._dead = true;
        clearTimeout(this._reconnectTimer);
        if (this.ws) this.ws.close();
    }
}

/* ── Diagramme ───────────────────────────────────────────────── */

function renderBarChart(container, results) {
    const { counts, percentages, total } = results;
    if (!counts) return;

    container.innerHTML = `
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem">${total} Antwort${total !== 1 ? 'en' : ''}</p>
        <div class="bar-chart">
            ${Object.entries(counts).map(([label, count]) => {
                const pct = percentages[label] || 0;
                return `
                    <div class="bar-row">
                        <span class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
                        <div class="bar-track">
                            <div class="bar-fill" style="width:${pct}%"></div>
                        </div>
                        <span class="bar-pct">${pct}%</span>
                    </div>`;
            }).join('')}
        </div>`;
}

function renderScaleChart(container, results) {
    const { distribution, avg, total, scaleMin, scaleMax } = results;
    if (!distribution) return;
    const maxCount = Math.max(1, ...Object.values(distribution));

    container.innerHTML = `
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">${total} Antwort${total !== 1 ? 'en' : ''}</p>
        <div style="font-size:2rem;font-weight:700;color:var(--primary);text-align:center;margin-bottom:1rem">
            Ø ${avg}
        </div>
        <div class="bar-chart">
            ${Object.entries(distribution).map(([val, count]) => {
                const pct = Math.round(count / maxCount * 100);
                return `
                    <div class="bar-row">
                        <span class="bar-label">${val}</span>
                        <div class="bar-track">
                            <div class="bar-fill" style="width:${pct}%"></div>
                        </div>
                        <span class="bar-pct">${count}</span>
                    </div>`;
            }).join('')}
        </div>`;
}

function renderWordCloud(container, results) {
    const { words, total } = results;
    if (!words) return;
    const maxFreq = Math.max(1, ...Object.values(words));
    const sorted = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 40);

    container.innerHTML = `
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem">${total} Antwort${total !== 1 ? 'en' : ''}</p>
        <div class="wordcloud">
            ${sorted.map(([word, freq]) => {
                const size = 0.9 + (freq / maxFreq) * 2.2;
                const opacity = 0.55 + (freq / maxFreq) * 0.45;
                return `<span class="wordcloud-word" style="font-size:${size}rem;opacity:${opacity}">${escapeHtml(word)}</span>`;
            }).join('')}
        </div>`;
}

function renderOpenAnswers(container, results) {
    const { answers, total } = results;
    if (!answers) return;

    container.innerHTML = `
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem">${total} Antwort${total !== 1 ? 'en' : ''}</p>
        <div class="qa-list">
            ${answers.length === 0
                ? '<p style="color:var(--text-muted);font-size:0.9rem">Noch keine Antworten.</p>'
                : answers.map(a => `
                    <div class="qa-item">
                        <span class="qa-text">${escapeHtml(a.text)}</span>
                    </div>`).join('')}
        </div>`;
}

function renderResults(container, results, question) {
    if (!results || !question) return;
    switch (results.type) {
        case 'multiple_choice': renderBarChart(container, results); break;
        case 'scale':           renderScaleChart(container, results); break;
        case 'wordcloud':       renderWordCloud(container, results); break;
        case 'open':            renderOpenAnswers(container, results); break;
    }
}

/* ── Fragetyp-Label ──────────────────────────────────────────── */
function typeLabel(type) {
    return { multiple_choice: 'Multiple Choice', wordcloud: 'Wortwolke', open: 'Offene Frage', scale: 'Skala' }[type] || type;
}
