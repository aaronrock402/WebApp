'use strict';

const root       = document.getElementById('appRoot');
const navActions = document.getElementById('navActions');

let currentSession = null;
let socket         = null;
let liveResults    = {};  // questionId -> results

// ── Router ────────────────────────────────────────────────────
function init() {
    const user = getUser();
    const token = getToken();
    if (user && token) {
        renderDashboard();
    } else {
        renderAuth('login');
    }
}

// ── Auth-Views ────────────────────────────────────────────────
function renderAuth(mode) {
    navActions.innerHTML = '';
    const isLogin = mode === 'login';

    root.innerHTML = `
        <div class="center">
            <div class="card fade-up">
                <h1 style="margin-bottom:0.3rem">${isLogin ? 'Moderator-Login' : 'Registrieren'}</h1>
                <p style="color:var(--text-muted);margin-bottom:1.5rem;font-size:0.9rem">
                    ${isLogin ? 'Mit deinem Konto anmelden' : 'Neues Moderator-Konto erstellen'}
                </p>
                <div id="alertBox"></div>
                <form id="authForm">
                    ${!isLogin ? `
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" id="nameInput" placeholder="Dein Name" required maxlength="60">
                        </div>` : ''}
                    <div class="form-group">
                        <label>E-Mail</label>
                        <input type="email" id="emailInput" placeholder="name@beispiel.de" required>
                    </div>
                    <div class="form-group">
                        <label>Passwort</label>
                        <input type="password" id="passwordInput" placeholder="Mindestens 6 Zeichen" required minlength="6">
                    </div>
                    <button type="submit" class="btn btn--primary btn--full" id="submitBtn">
                        ${isLogin ? 'Anmelden' : 'Registrieren'}
                    </button>
                </form>
                <p style="margin-top:1.2rem;font-size:0.85rem;color:var(--text-muted);text-align:center">
                    ${isLogin
                        ? 'Noch kein Konto? <a href="#" id="switchLink" style="color:var(--primary)">Registrieren</a>'
                        : 'Bereits registriert? <a href="#" id="switchLink" style="color:var(--primary)">Anmelden</a>'}
                </p>
            </div>
        </div>`;

    document.getElementById('switchLink').addEventListener('click', (e) => {
        e.preventDefault();
        renderAuth(isLogin ? 'register' : 'login');
    });

    document.getElementById('authForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn       = document.getElementById('submitBtn');
        const alertBox  = document.getElementById('alertBox');
        const email     = document.getElementById('emailInput').value.trim();
        const password  = document.getElementById('passwordInput').value;
        const name      = document.getElementById('nameInput')?.value.trim();

        btn.disabled = true;
        btn.textContent = '…';
        clearAlert(alertBox);

        const url  = isLogin ? '/api/auth/login' : '/api/auth/register';
        const body = isLogin ? { email, password } : { email, password, name };

        const { ok, data } = await apiFetch(url, { method: 'POST', body: JSON.stringify(body) });
        if (!ok) {
            showAlert(alertBox, data.error || 'Fehler bei der Authentifizierung.', 'error');
            btn.disabled = false;
            btn.textContent = isLogin ? 'Anmelden' : 'Registrieren';
            return;
        }

        if (!isLogin) {
            // Nach Registrierung direkt einloggen
            const loginRes = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
            if (!loginRes.ok) { renderAuth('login'); return; }
            setToken(loginRes.data.token);
            setUser({ name: loginRes.data.name, id: loginRes.data.id });
        } else {
            setToken(data.token);
            setUser({ name: data.name, id: data.id });
        }
        renderDashboard();
    });
}

// ── Dashboard ─────────────────────────────────────────────────
async function renderDashboard() {
    const user = getUser();
    navActions.innerHTML = `
        <span style="font-size:0.85rem;color:var(--text-muted)">Hallo, ${escapeHtml(user?.name || '')}</span>
        <button class="btn btn--secondary btn--sm" id="logoutBtn">Abmelden</button>`;

    document.getElementById('logoutBtn').addEventListener('click', () => {
        clearAuth();
        if (socket) { socket.destroy(); socket = null; }
        currentSession = null;
        renderAuth('login');
    });

    root.innerHTML = `
        <div class="container" style="padding-top:2rem;padding-bottom:3rem">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem">
                <h1>Meine Sessions</h1>
                <button class="btn btn--primary" id="newSessionBtn">+ Neue Session</button>
            </div>
            <div id="sessionList"><div class="waiting"><div class="spinner"></div><p>Lade Sessions…</p></div></div>
        </div>`;

    document.getElementById('newSessionBtn').addEventListener('click', showNewSessionModal);

    await loadMySessions();
}

async function loadMySessions() {
    const list = document.getElementById('sessionList');
    const { ok, data } = await apiFetch('/api/sessions/mine');
    if (!ok) { list.innerHTML = `<div class="alert alert--error">${escapeHtml(data.error)}</div>`; return; }

    if (data.length === 0) {
        list.innerHTML = `
            <div class="card" style="text-align:center;padding:2.5rem">
                <p style="color:var(--text-muted);margin-bottom:1.2rem">Noch keine Sessions. Erstelle eine!</p>
                <button class="btn btn--primary" onclick="showNewSessionModal()">+ Neue Session</button>
            </div>`;
        return;
    }

    list.innerHTML = data.map(s => `
        <div class="question-card" style="cursor:pointer" data-id="${s.id}">
            <div class="question-card__header">
                <div>
                    <span class="badge ${s.closed ? 'badge--done' : 'badge--active'}" style="margin-bottom:0.4rem">
                        ${s.closed ? 'Geschlossen' : 'Aktiv'}
                    </span>
                    <div class="question-card__title">${escapeHtml(s.title)}</div>
                    <div style="font-size:0.82rem;color:var(--text-muted);margin-top:0.3rem">
                        Code: <strong style="color:var(--primary);letter-spacing:0.1em">${s.code}</strong>
                        &nbsp;·&nbsp; ${s.questions.length} Frage${s.questions.length !== 1 ? 'n' : ''}
                    </div>
                </div>
                <div class="question-card__actions">
                    <button class="btn btn--primary btn--sm open-btn" data-id="${s.id}">Öffnen</button>
                    <button class="btn btn--danger btn--sm delete-btn" data-id="${s.id}">Löschen</button>
                </div>
            </div>
        </div>`).join('');

    list.querySelectorAll('.open-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); openSession(btn.dataset.id); });
    });
    list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('Session wirklich löschen?')) return;
            await apiFetch(`/api/sessions/${btn.dataset.id}`, { method: 'DELETE' });
            loadMySessions();
        });
    });
}

// ── Session öffnen ────────────────────────────────────────────
async function openSession(id) {
    const { ok, data } = await apiFetch(`/api/sessions/${id}`);
    if (!ok) return;
    currentSession = data;
    liveResults = {};

    if (socket) socket.destroy();
    socket = new LiveSocket(id, 'moderator', {
        ANSWER_UPDATE(msg) {
            liveResults[msg.questionId] = msg.results;
            const c = document.getElementById(`chart-${msg.questionId}`);
            const q = currentSession.questions.find(q => q.id === msg.questionId);
            if (c && q) renderResults(c, msg.results, q);
            const cnt = document.getElementById(`count-${msg.questionId}`);
            if (cnt) cnt.textContent = msg.answerCount;
        },
        PARTICIPANT_COUNT(msg) {
            currentSession.participantCount = msg.count;
            const el = document.getElementById('participantCount');
            if (el) el.textContent = msg.count;
        },
        SESSION_UPDATE(msg) {
            currentSession = msg.session;
            renderSessionView();
        },
    });

    renderSessionView();
    // Bereits vorhandene Live-Ergebnisse sofort einzeichnen
    currentSession.questions.forEach(q => {
        if (liveResults[q.id]) {
            const c = document.getElementById(`chart-${q.id}`);
            if (c) renderResults(c, liveResults[q.id], q);
        }
    });
}

function renderSessionView() {
    const s = currentSession;
    const user = getUser();
    navActions.innerHTML = `
        <span class="ws-indicator connected" style="margin-right:0.25rem"></span>
        <button class="btn btn--secondary btn--sm" id="backBtn">← Übersicht</button>
        <button class="btn btn--secondary btn--sm" id="logoutBtn2">Abmelden</button>`;

    document.getElementById('backBtn').addEventListener('click', () => {
        if (socket) { socket.destroy(); socket = null; }
        renderDashboard();
    });
    document.getElementById('logoutBtn2').addEventListener('click', () => {
        clearAuth();
        if (socket) { socket.destroy(); socket = null; }
        renderAuth('login');
    });

    root.innerHTML = `
        <div class="container" style="padding-top:2rem;padding-bottom:3rem">

            <!-- Header -->
            <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem">
                <div>
                    <h1>${escapeHtml(s.title)}</h1>
                    <div style="margin-top:0.4rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
                        <span style="font-size:0.85rem;color:var(--text-muted)">Session-Code:</span>
                        <span class="join-code" style="font-size:1.6rem;padding:0.25rem 0.75rem">${s.code}</span>
                        <span style="font-size:0.85rem;color:var(--text-muted)">
                            👥 <strong id="participantCount">${s.participantCount}</strong> Teilnehmer
                        </span>
                        ${s.closed
                            ? `<span class="badge badge--done">Geschlossen</span>`
                            : `<button class="btn btn--danger btn--sm" id="closeSessionBtn">Session schließen</button>`}
                    </div>
                </div>
                <button class="btn btn--primary" id="addQuestionBtn">+ Frage hinzufügen</button>
                <a class="btn btn--secondary" href="display.html?id=${s.id}" target="_blank" title="Präsentations-Modus in neuem Tab öffnen">📽 Präsentation</a>
            </div>

            <!-- Fragen -->
            <div id="questionsList">
                ${s.questions.length === 0
                    ? `<div class="card" style="text-align:center;padding:2.5rem;color:var(--text-muted)">Noch keine Fragen. Füge eine hinzu!</div>`
                    : s.questions.map(q => renderQuestionCard(q, s)).join('')}
            </div>
        </div>`;

    document.getElementById('addQuestionBtn').addEventListener('click', showAddQuestionModal);

    if (!s.closed) {
        document.getElementById('closeSessionBtn')?.addEventListener('click', async () => {
            if (!confirm('Session wirklich für neue Teilnehmer schließen?')) return;
            await apiFetch(`/api/sessions/${s.id}/close`, { method: 'PUT' });
            currentSession.closed = true;
            renderSessionView();
        });
    }

    // Fragen-Aktionen verdrahten
    s.questions.forEach(q => {
        const startBtn   = document.getElementById(`start-${q.id}`);
        const stopBtn    = document.getElementById(`stop-${q.id}`);
        const showBtn    = document.getElementById(`show-${q.id}`);
        const deleteBtn  = document.getElementById(`del-${q.id}`);
        const upBtn      = document.getElementById(`up-${q.id}`);
        const downBtn    = document.getElementById(`down-${q.id}`);

        startBtn?.addEventListener('click', async () => {
            await apiFetch(`/api/sessions/${s.id}/active`, {
                method: 'PUT',
                body: JSON.stringify({ questionId: q.id, action: 'start' }),
            });
            s.questions.forEach(x => { if (x.status === 'active') x.status = 'done'; });
            q.status = 'active';
            s.activeQuestionId = q.id;
            renderSessionView();
        });

        stopBtn?.addEventListener('click', async () => {
            await apiFetch(`/api/sessions/${s.id}/active`, {
                method: 'PUT',
                body: JSON.stringify({ questionId: q.id, action: 'stop' }),
            });
            q.status = 'done';
            s.activeQuestionId = null;
            renderSessionView();
        });

        showBtn?.addEventListener('click', async () => {
            await apiFetch(`/api/sessions/${s.id}/show-results`, {
                method: 'PUT',
                body: JSON.stringify({ questionId: q.id, visible: true }),
            });
        });

        deleteBtn?.addEventListener('click', async () => {
            if (!confirm('Frage wirklich löschen?')) return;
            await apiFetch(`/api/sessions/${s.id}/questions/${q.id}`, { method: 'DELETE' });
            // SESSION_UPDATE via WebSocket aktualisiert currentSession und rendert neu
        });

        upBtn?.addEventListener('click', async () => {
            await apiFetch(`/api/sessions/${s.id}/questions/${q.id}/move`, {
                method: 'PUT',
                body: JSON.stringify({ direction: 'up' }),
            });
            // SESSION_UPDATE via WebSocket rendert neu
        });

        downBtn?.addEventListener('click', async () => {
            await apiFetch(`/api/sessions/${s.id}/questions/${q.id}/move`, {
                method: 'PUT',
                body: JSON.stringify({ direction: 'down' }),
            });
            // SESSION_UPDATE via WebSocket rendert neu
        });
    });
}

function renderQuestionCard(q, s) {
    const isActive = s.activeQuestionId === q.id;
    const results  = liveResults[q.id];

    const actions = [];
    if (q.status === 'pending' && !s.closed) {
        actions.push(`<button class="btn btn--success btn--sm" id="start-${q.id}">▶ Starten</button>`);
    }
    if (isActive) {
        actions.push(`<button class="btn btn--danger btn--sm" id="stop-${q.id}">⏹ Stoppen</button>`);
        actions.push(`<button class="btn btn--secondary btn--sm" id="show-${q.id}">📊 Ergebnisse zeigen</button>`);
    }
    if (q.status === 'done' && !isActive) {
        actions.push(`<button class="btn btn--secondary btn--sm" id="show-${q.id}">📊 Ergebnisse zeigen</button>`);
    }
    const qIdx = s.questions.findIndex(x => x.id === q.id);
    if (qIdx > 0 && q.status === 'pending') {
        actions.push(`<button class="btn btn--secondary btn--sm" id="up-${q.id}" title="Nach oben">↑</button>`);
    }
    if (qIdx < s.questions.length - 1 && q.status === 'pending') {
        actions.push(`<button class="btn btn--secondary btn--sm" id="down-${q.id}" title="Nach unten">↓</button>`);
    }
    actions.push(`<button class="btn btn--danger btn--sm" id="del-${q.id}">🗑</button>`);

    const badgeClass = isActive ? 'badge--active' : (q.status === 'done' ? 'badge--done' : 'badge--pending');
    const badgeLabel = isActive ? 'Aktiv' : (q.status === 'done' ? 'Beendet' : 'Ausstehend');

    const chartSection = (isActive || q.status === 'done') && results
        ? `<div class="chart-wrapper" id="chart-${q.id}"></div>`
        : (isActive ? `<div class="chart-wrapper" id="chart-${q.id}"><p style="color:var(--text-muted);font-size:0.85rem">Warte auf Antworten…</p></div>` : '');

    return `
        <div class="question-card ${isActive ? 'question-card--active' : ''}" id="qcard-${q.id}">
            <div class="question-card__header">
                <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.4rem;flex-wrap:wrap">
                        <span class="badge ${badgeClass}">${badgeLabel}</span>
                        <span class="badge badge--pending">${typeLabel(q.type)}</span>
                        ${isActive ? `<span style="font-size:0.8rem;color:var(--text-muted)">
                            Antworten: <strong id="count-${q.id}">${q.answerCount || 0}</strong>
                        </span>` : ''}
                    </div>
                    <div class="question-card__title">${escapeHtml(q.text)}</div>
                    ${q.type === 'multiple_choice' && q.options.length
                        ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.3rem">${q.options.map(o => escapeHtml(o)).join(' · ')}</div>`
                        : ''}
                    ${q.type === 'scale' ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.3rem">Skala: ${q.scaleMin}–${q.scaleMax}</div>` : ''}
                </div>
                <div class="question-card__actions">${actions.join('')}</div>
            </div>
            ${chartSection}
        </div>`;
}

// ── Modals ────────────────────────────────────────────────────
function showNewSessionModal() {
    const overlay = createOverlay();
    overlay.innerHTML = `
        <div class="card fade-up" style="max-width:440px;width:100%">
            <h2 style="margin-bottom:1.2rem">Neue Session</h2>
            <div id="modalAlert"></div>
            <form id="newSessionForm">
                <div class="form-group">
                    <label>Titel der Session</label>
                    <input type="text" id="sessionTitle" placeholder="z. B. Vorlesung WS 2025/26" required maxlength="80" autofocus>
                </div>
                <div style="display:flex;gap:0.75rem;margin-top:0.5rem">
                    <button type="button" class="btn btn--secondary btn--full" id="cancelNewSession">Abbrechen</button>
                    <button type="submit" class="btn btn--primary btn--full">Erstellen</button>
                </div>
            </form>
        </div>`;

    document.body.appendChild(overlay);
    document.getElementById('cancelNewSession').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    document.getElementById('newSessionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('sessionTitle').value.trim();
        const { ok, data } = await apiFetch('/api/sessions', { method: 'POST', body: JSON.stringify({ title }) });
        if (!ok) { showAlert(document.getElementById('modalAlert'), data.error, 'error'); return; }
        overlay.remove();
        openSession(data.id);
    });
}

function showAddQuestionModal() {
    const overlay = createOverlay();
    overlay.innerHTML = `
        <div class="card fade-up" style="max-width:520px;width:100%;max-height:90vh;overflow-y:auto">
            <h2 style="margin-bottom:1.2rem">Frage hinzufügen</h2>
            <div id="modalAlert"></div>
            <form id="addQuestionForm">
                <div class="form-group">
                    <label>Fragetyp</label>
                    <select id="qType">
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="scale">Skala / Rating</option>
                        <option value="wordcloud">Wortwolke</option>
                        <option value="open">Offene Frage (Q&amp;A)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Fragetext</label>
                    <input type="text" id="qText" placeholder="Deine Frage…" required maxlength="200" autofocus>
                </div>
                <div id="typeOptions"></div>
                <div style="display:flex;gap:0.75rem;margin-top:1rem">
                    <button type="button" class="btn btn--secondary btn--full" id="cancelAdd">Abbrechen</button>
                    <button type="submit" class="btn btn--primary btn--full">Hinzufügen</button>
                </div>
            </form>
        </div>`;

    document.body.appendChild(overlay);
    document.getElementById('cancelAdd').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const qType    = document.getElementById('qType');
    const typeOpts = document.getElementById('typeOptions');

    function renderTypeOptions(type) {
        if (type === 'multiple_choice') {
            typeOpts.innerHTML = `
                <div class="form-group">
                    <label>Antwortoptionen (eine pro Zeile, mind. 2)</label>
                    <textarea id="optionsInput" rows="4" placeholder="Option A&#10;Option B&#10;Option C"></textarea>
                </div>`;
        } else if (type === 'scale') {
            typeOpts.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                    <div class="form-group">
                        <label>Minimum</label>
                        <input type="number" id="scaleMin" value="1" min="0" max="99">
                    </div>
                    <div class="form-group">
                        <label>Maximum</label>
                        <input type="number" id="scaleMax" value="5" min="1" max="100">
                    </div>
                </div>`;
        } else {
            typeOpts.innerHTML = '';
        }
    }

    renderTypeOptions(qType.value);
    qType.addEventListener('change', () => renderTypeOptions(qType.value));

    document.getElementById('addQuestionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('modalAlert');
        const type     = qType.value;
        const text     = document.getElementById('qText').value.trim();
        let options, scaleMin, scaleMax;

        if (type === 'multiple_choice') {
            options = document.getElementById('optionsInput').value
                .split('\n').map(s => s.trim()).filter(Boolean);
            if (options.length < 2) { showAlert(alertBox, 'Mindestens 2 Optionen erforderlich.', 'error'); return; }
            if (options.length > 6) { showAlert(alertBox, 'Maximal 6 Optionen erlaubt.', 'error'); return; }
        }
        if (type === 'scale') {
            scaleMin = parseInt(document.getElementById('scaleMin').value);
            scaleMax = parseInt(document.getElementById('scaleMax').value);
            if (scaleMin >= scaleMax) { showAlert(alertBox, 'Maximum muss größer als Minimum sein.', 'error'); return; }
        }

        const { ok, data } = await apiFetch(`/api/sessions/${currentSession.id}/questions`, {
            method: 'POST',
            body: JSON.stringify({ type, text, options, scaleMin, scaleMax }),
        });

        if (!ok) { showAlert(alertBox, data.error, 'error'); return; }
        overlay.remove();
        // SESSION_UPDATE via WebSocket aktualisiert currentSession und rendert neu
    });
}

function createOverlay() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.7);
        display:flex;align-items:center;justify-content:center;
        z-index:1000;padding:1rem;`;
    return overlay;
}

// Start
init();
