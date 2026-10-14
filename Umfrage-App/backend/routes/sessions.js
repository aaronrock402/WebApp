'use strict';
const express = require('express');
const store   = require('../store/inMemory');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Hilfsfunktion: Session-Objekt bereinigt zurückgeben (ohne interne Antwortdaten)
function publicSession(s) {
    return {
        id: s.id,
        code: s.code,
        title: s.title,
        closed: s.closed,
        activeQuestionId: s.activeQuestionId,
        showResults: s.showResults,
        participantCount: s.participantCount,
        questions: s.questions.map(q => publicQuestion(q)),
    };
}

function publicQuestion(q) {
    return {
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        scaleMin: q.scaleMin,
        scaleMax: q.scaleMax,
        status: q.status,
        answerCount: q.answers.length,
    };
}

// GET /api/sessions?code=XXXXXX  — Session per Code finden
router.get('/', (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Code erforderlich.' });
    const session = store.getSessionByCode(code);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });
    if (session.closed) return res.status(410).json({ error: 'Session ist geschlossen.' });
    res.json(publicSession(session));
});

// GET /api/sessions/mine  — Eigene Sessions (Moderator)
router.get('/mine', requireAuth, (req, res) => {
    const list = store.getSessionsByOwner(req.user.id);
    res.json(list.map(publicSession));
});

// POST /api/sessions  — Neue Session erstellen
router.post('/', requireAuth, (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Titel erforderlich.' });
    const session = store.createSession(title, req.user.id);
    res.status(201).json(publicSession(session));
});

// GET /api/sessions/:id  — Session abrufen
router.get('/:id', (req, res) => {
    const session = store.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });
    res.json(publicSession(session));
});

// DELETE /api/sessions/:id  — Session löschen (Moderator)
router.delete('/:id', requireAuth, (req, res) => {
    const session = store.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });
    if (session.ownerId !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff.' });
    store.deleteSession(req.params.id);
    res.json({ ok: true });
});

// POST /api/sessions/:id/questions  — Frage hinzufügen
router.post('/:id/questions', requireAuth, (req, res) => {
    const session = store.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });
    if (session.ownerId !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff.' });

    const { type, text, options, scaleMin, scaleMax } = req.body;
    const validTypes = ['multiple_choice', 'wordcloud', 'open', 'scale'];
    if (!type || !validTypes.includes(type)) {
        return res.status(400).json({ error: 'Ungültiger Fragetyp.' });
    }
    if (!text) return res.status(400).json({ error: 'Fragetext erforderlich.' });
    if (type === 'multiple_choice' && (!options || options.length < 2)) {
        return res.status(400).json({ error: 'Mindestens 2 Antwortoptionen erforderlich.' });
    }

    const question = store.addQuestion(req.params.id, { type, text, options, scaleMin, scaleMax });
    res.status(201).json(publicQuestion(question));

    // WebSocket-Broadcast: Fragenliste aktualisiert
    req.app.locals.broadcast(req.params.id, { type: 'SESSION_UPDATE', session: publicSession(session) });
});

// DELETE /api/sessions/:id/questions/:qid  — Frage löschen
router.delete('/:id/questions/:qid', requireAuth, (req, res) => {
    const session = store.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });
    if (session.ownerId !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff.' });
    const idx = session.questions.findIndex(q => q.id === req.params.qid);
    if (idx === -1) return res.status(404).json({ error: 'Frage nicht gefunden.' });
    session.questions.splice(idx, 1);
    if (session.activeQuestionId === req.params.qid) session.activeQuestionId = null;
    res.json({ ok: true });
    req.app.locals.broadcast(req.params.id, { type: 'SESSION_UPDATE', session: publicSession(session) });
});

// PUT /api/sessions/:id/questions/:qid/move  — Reihenfolge ändern
router.put('/:id/questions/:qid/move', requireAuth, (req, res) => {
    const session = store.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });
    if (session.ownerId !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff.' });

    const { direction } = req.body;
    const idx = session.questions.findIndex(q => q.id === req.params.qid);
    if (idx === -1) return res.status(404).json({ error: 'Frage nicht gefunden.' });

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= session.questions.length) {
        return res.status(400).json({ error: 'Verschieben nicht möglich.' });
    }

    [session.questions[idx], session.questions[newIdx]] = [session.questions[newIdx], session.questions[idx]];
    res.json({ ok: true });
    req.app.locals.broadcast(req.params.id, { type: 'SESSION_UPDATE', session: publicSession(session) });
});

// PUT /api/sessions/:id/active  — Aktive Frage setzen / stoppen
router.put('/:id/active', requireAuth, (req, res) => {
    const session = store.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });
    if (session.ownerId !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff.' });

    const { questionId, action } = req.body; // action: 'start' | 'stop'

    if (action === 'start') {
        const q = store.getQuestion(req.params.id, questionId);
        if (!q) return res.status(404).json({ error: 'Frage nicht gefunden.' });
        // Vorherige aktive Frage beenden
        if (session.activeQuestionId) {
            const prev = store.getQuestion(req.params.id, session.activeQuestionId);
            if (prev) prev.status = 'done';
        }
        q.status = 'active';
        session.activeQuestionId = questionId;
        session.showResults = false;
        res.json({ ok: true });
        req.app.locals.broadcast(req.params.id, { type: 'QUESTION_START', question: publicQuestion(q) });

    } else if (action === 'stop') {
        if (session.activeQuestionId) {
            const q = store.getQuestion(req.params.id, session.activeQuestionId);
            if (q) q.status = 'done';
        }
        session.activeQuestionId = null;
        res.json({ ok: true });
        req.app.locals.broadcast(req.params.id, { type: 'QUESTION_STOP' });

    } else {
        res.status(400).json({ error: 'Aktion muss "start" oder "stop" sein.' });
    }
});

// PUT /api/sessions/:id/show-results  — Ergebnisse für Teilnehmer sichtbar machen
router.put('/:id/show-results', requireAuth, (req, res) => {
    const session = store.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });
    if (session.ownerId !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff.' });

    const { questionId, visible } = req.body;
    const q = store.getQuestion(req.params.id, questionId);
    if (!q) return res.status(404).json({ error: 'Frage nicht gefunden.' });

    const results = store.computeResults(q);
    session.showResults = visible !== false;
    res.json({ ok: true });

    if (session.showResults) {
        req.app.locals.broadcast(req.params.id, {
            type: 'SHOW_RESULTS',
            questionId,
            results,
            question: publicQuestion(q),
        });
    }
});

// PUT /api/sessions/:id/close  — Session schließen
router.put('/:id/close', requireAuth, (req, res) => {
    const session = store.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });
    if (session.ownerId !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff.' });
    session.closed = true;
    res.json({ ok: true });
    req.app.locals.broadcast(req.params.id, { type: 'SESSION_CLOSED' });
});

// POST /api/sessions/:id/answers  — Antwort einreichen (Teilnehmer)
router.post('/:id/answers', (req, res) => {
    const session = store.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });

    const { questionId, value, participantId } = req.body;
    if (!questionId || value === undefined || value === null || !participantId) {
        return res.status(400).json({ error: 'questionId, value und participantId erforderlich.' });
    }

    const q = store.getQuestion(req.params.id, questionId);
    if (!q) return res.status(404).json({ error: 'Frage nicht gefunden.' });
    if (q.status !== 'active') return res.status(409).json({ error: 'Frage ist nicht aktiv.' });

    const result = store.recordAnswer(req.params.id, questionId, participantId, value);
    if (!result) return res.status(500).json({ error: 'Fehler beim Speichern.' });
    if (result.alreadyVoted) return res.status(409).json({ error: 'Bereits abgestimmt.' });

    // Live-Update an Moderator
    const results = store.computeResults(q);
    req.app.locals.broadcast(req.params.id, {
        type: 'ANSWER_UPDATE',
        questionId,
        results,
        answerCount: q.answers.length,
    });

    res.json({ ok: true });
});

// GET /api/sessions/:id/results/:qid  — Ergebnisse einer Frage abrufen
router.get('/:id/results/:qid', (req, res) => {
    const session = store.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });
    const q = store.getQuestion(req.params.id, req.params.qid);
    if (!q) return res.status(404).json({ error: 'Frage nicht gefunden.' });
    // Ergebnisse sind sichtbar wenn: Moderator freigeschaltet hat ODER Eigentümer fragt
    const authHeader = req.headers['authorization'];
    let isOwner = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const jwt = require('jsonwebtoken');
            const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
            isOwner = payload.id === session.ownerId;
        } catch {}
    }
    if (!session.showResults && !isOwner) {
        return res.status(403).json({ error: 'Ergebnisse noch nicht freigegeben.' });
    }
    res.json(store.computeResults(q));
});

module.exports = router;
