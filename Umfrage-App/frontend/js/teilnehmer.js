'use strict';

const sessionId     = getParam('id');
const participantId = (() => {
    let id = sessionStorage.getItem('vl_pid');
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now(); sessionStorage.setItem('vl_pid', id); }
    return id;
})();

const content      = document.getElementById('mainContent');
const wsIndicator  = document.getElementById('wsIndicator');
const sessionTitle = document.getElementById('sessionTitle');

let currentQuestion = null;
let hasVoted        = false;
let votedQuestions  = JSON.parse(sessionStorage.getItem('vl_voted') || '{}');

if (!sessionId) {
    window.location.href = 'index.html';
}

function saveVoted() {
    sessionStorage.setItem('vl_voted', JSON.stringify(votedQuestions));
}

// ── Initialer Laden ───────────────────────────────────────────
async function loadSession() {
    const { ok, data } = await apiFetch(`/api/sessions/${sessionId}`);
    if (!ok) {
        content.innerHTML = `<div class="card fade-up" style="max-width:460px;margin:3rem auto"><div class="alert alert--error">${escapeHtml(data.error || 'Session nicht gefunden.')}</div><a href="index.html" class="btn btn--secondary btn--full" style="margin-top:1rem">Zurück</a></div>`;
        return;
    }
    sessionTitle.textContent = data.title;

    if (data.activeQuestionId) {
        const q = data.questions.find(q => q.id === data.activeQuestionId);
        if (q) showQuestion(q, data.showResults, null);
        else   showWaiting();
    } else if (data.closed) {
        showClosed();
    } else {
        showWaiting();
    }
}

// ── WebSocket ─────────────────────────────────────────────────
const socket = new LiveSocket(sessionId, 'teilnehmer', {
    onConnect()    { wsIndicator.className = 'ws-indicator connected'; },
    onDisconnect() { wsIndicator.className = 'ws-indicator disconnected'; },

    QUESTION_START(msg) {
        currentQuestion = msg.question;
        hasVoted = !!votedQuestions[msg.question.id];
        showQuestion(msg.question, false, null);
    },

    QUESTION_STOP() {
        currentQuestion = null;
        showWaiting();
    },

    SHOW_RESULTS(msg) {
        if (currentQuestion && currentQuestion.id === msg.questionId) {
            showResults(msg.results, currentQuestion);
        } else {
            showResults(msg.results, msg.question);
        }
    },

    ANSWER_UPDATE(msg) {
        // Wenn Ergebnisse bereits sichtbar, live aktualisieren
        if (document.getElementById('resultsView')) {
            const container = document.getElementById('chartContainer');
            if (container) renderResults(container, msg.results, currentQuestion);
        }
    },

    SESSION_CLOSED() {
        showClosed();
    },
});

// ── Views ─────────────────────────────────────────────────────
function showWaiting() {
    content.innerHTML = `
        <div class="waiting fade-up">
            <div class="spinner"></div>
            <h2 style="color:var(--text-muted)">Warte auf die nächste Frage…</h2>
            <p style="font-size:0.85rem">Der Moderator startet gleich.</p>
        </div>`;
}

function showClosed() {
    content.innerHTML = `
        <div class="card fade-up" style="max-width:460px;margin:3rem auto;text-align:center">
            <h2 style="margin-bottom:0.5rem">Session beendet</h2>
            <p style="color:var(--text-muted);margin-bottom:1.5rem">Diese Session wurde vom Moderator geschlossen.</p>
            <a href="index.html" class="btn btn--primary">Neue Session beitreten</a>
        </div>`;
}

function showResults(results, question) {
    content.innerHTML = `
        <div class="card card--wide fade-up" id="resultsView" style="margin:0 auto">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem">
                <span class="badge badge--done">${typeLabel(question.type)}</span>
                <h2>${escapeHtml(question.text)}</h2>
            </div>
            <div id="chartContainer"></div>
        </div>`;
    renderResults(document.getElementById('chartContainer'), results, question);
}

function showQuestion(question, resultsVisible, existingResults) {
    if (resultsVisible && existingResults) {
        showResults(existingResults, question);
        return;
    }

    hasVoted = !!votedQuestions[question.id];
    currentQuestion = question;

    if (hasVoted) {
        content.innerHTML = `
            <div class="card fade-up" style="max-width:500px;margin:3rem auto;text-align:center">
                <div class="alert alert--success">Deine Antwort wurde gespeichert!</div>
                <p style="color:var(--text-muted)">Warte auf die Ergebnisse…</p>
                <div class="spinner" style="margin:1rem auto 0"></div>
            </div>`;
        return;
    }

    let inputHtml = '';
    if (question.type === 'multiple_choice') {
        inputHtml = `
            <div class="options-grid" id="optionsGrid">
                ${question.options.map((opt, i) => `
                    <button class="option-btn" data-value="${escapeHtml(opt)}" data-index="${i}">
                        ${escapeHtml(opt)}
                    </button>`).join('')}
            </div>`;
    } else if (question.type === 'scale') {
        inputHtml = `
            <div class="scale-container">
                <div class="scale-value" id="scaleDisplay">${question.scaleMin}</div>
                <input type="range" id="scaleInput"
                    min="${question.scaleMin}" max="${question.scaleMax}"
                    value="${question.scaleMin}" step="1">
                <div class="scale-labels">
                    <span>${question.scaleMin}</span>
                    <span>${question.scaleMax}</span>
                </div>
            </div>`;
    } else if (question.type === 'wordcloud') {
        inputHtml = `
            <div class="form-group" style="margin-top:1.2rem">
                <input type="text" id="wordInput" placeholder="Dein Stichwort…" maxlength="30" autofocus>
                <span style="font-size:0.75rem;color:var(--text-muted)">Max. 30 Zeichen</span>
            </div>`;
    } else if (question.type === 'open') {
        inputHtml = `
            <div class="form-group" style="margin-top:1.2rem">
                <textarea id="openInput" placeholder="Deine Antwort…" maxlength="300" rows="3" autofocus></textarea>
                <span style="font-size:0.75rem;color:var(--text-muted)">Max. 300 Zeichen</span>
            </div>`;
    }

    content.innerHTML = `
        <div class="card card--wide fade-up" style="margin:0 auto">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
                <span class="badge badge--active">${typeLabel(question.type)}</span>
            </div>
            <h2 style="margin-bottom:0.5rem">${escapeHtml(question.text)}</h2>
            ${inputHtml}
            <div id="submitArea" style="margin-top:1.5rem">
                ${question.type !== 'multiple_choice'
                    ? `<button id="submitBtn" class="btn btn--primary btn--full">Absenden</button>`
                    : ''}
            </div>
            <div id="alertBox" style="margin-top:0.75rem"></div>
        </div>`;

    // Event-Handler
    if (question.type === 'multiple_choice') {
        document.getElementById('optionsGrid').addEventListener('click', (e) => {
            const btn = e.target.closest('.option-btn');
            if (!btn) return;
            document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            submitAnswer(btn.dataset.value);
        });
    }

    if (question.type === 'scale') {
        const slider  = document.getElementById('scaleInput');
        const display = document.getElementById('scaleDisplay');
        slider.addEventListener('input', () => { display.textContent = slider.value; });
        document.getElementById('submitBtn').addEventListener('click', () => submitAnswer(slider.value));
    }

    if (question.type === 'wordcloud') {
        document.getElementById('submitBtn').addEventListener('click', () => {
            const val = document.getElementById('wordInput').value.trim();
            if (!val) { showAlert(document.getElementById('alertBox'), 'Bitte ein Stichwort eingeben.'); return; }
            submitAnswer(val);
        });
    }

    if (question.type === 'open') {
        document.getElementById('submitBtn').addEventListener('click', () => {
            const val = document.getElementById('openInput').value.trim();
            if (!val) { showAlert(document.getElementById('alertBox'), 'Bitte eine Antwort eingeben.'); return; }
            submitAnswer(val);
        });
    }
}

async function submitAnswer(value) {
    if (!currentQuestion) return;

    const alertBox = document.getElementById('alertBox');
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.disabled = true;

    const { ok, data } = await apiFetch(`/api/sessions/${sessionId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ questionId: currentQuestion.id, value, participantId }),
    });

    if (!ok) {
        showAlert(alertBox, data.error || 'Fehler beim Absenden.', 'error');
        if (submitBtn) submitBtn.disabled = false;
        return;
    }

    votedQuestions[currentQuestion.id] = true;
    saveVoted();
    hasVoted = true;

    content.innerHTML = `
        <div class="card fade-up" style="max-width:500px;margin:3rem auto;text-align:center">
            <div class="alert alert--success" style="font-size:1rem">Deine Antwort wurde gespeichert!</div>
            <p style="color:var(--text-muted);margin-top:0.5rem">Warte auf die Ergebnisse…</p>
            <div class="spinner" style="margin:1rem auto 0"></div>
        </div>`;
}

// Start
loadSession();
