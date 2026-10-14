'use strict';

const users    = new Map(); // id -> { id, email, passwordHash, name }
const sessions = new Map(); // id -> Session-Objekt
let nextUserId    = 1;
let nextSessionId = 1;
let nextQuestionId = 1;

function createUser(email, passwordHash, name) {
    const id = String(nextUserId++);
    users.set(id, { id, email, passwordHash, name });
    return users.get(id);
}

function findUserByEmail(email) {
    for (const u of users.values()) {
        if (u.email === email) return u;
    }
    return null;
}

function findUserById(id) {
    return users.get(id) || null;
}

function createSession(title, ownerId) {
    const id   = String(nextSessionId++);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const session = {
        id, code, title, ownerId,
        questions: [],
        activeQuestionId: null,
        showResults: false,
        closed: false,
        participantCount: 0,
    };
    sessions.set(id, session);
    return session;
}

function getSessionByCode(code) {
    for (const s of sessions.values()) {
        if (s.code === code) return s;
    }
    return null;
}

function getSessionById(id) {
    return sessions.get(id) || null;
}

function getSessionsByOwner(ownerId) {
    return [...sessions.values()].filter(s => s.ownerId === ownerId);
}

function addQuestion(sessionId, { type, text, options, scaleMin, scaleMax }) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    const id = String(nextQuestionId++);
    const question = {
        id, type, text,
        options: options || [],
        scaleMin: scaleMin ?? 1,
        scaleMax: scaleMax ?? 5,
        answers: [],   // { value, participantId }
        status: 'pending', // pending | active | done
    };
    session.questions.push(question);
    return question;
}

function getQuestion(sessionId, questionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    return session.questions.find(q => q.id === questionId) || null;
}

function recordAnswer(sessionId, questionId, participantId, value) {
    const q = getQuestion(sessionId, questionId);
    if (!q) return null;
    // Mehrfach-Abstimmungsschutz
    const already = q.answers.find(a => a.participantId === participantId);
    if (already) return { alreadyVoted: true };
    q.answers.push({ participantId, value });
    return { ok: true };
}

function computeResults(question) {
    const { type, answers, options, scaleMin, scaleMax } = question;

    if (type === 'multiple_choice') {
        const counts = {};
        options.forEach(o => { counts[o] = 0; });
        answers.forEach(a => { if (counts[a.value] !== undefined) counts[a.value]++; });
        const total = answers.length;
        return { type, total, counts, percentages: Object.fromEntries(
            Object.entries(counts).map(([k, v]) => [k, total ? Math.round(v / total * 100) : 0])
        )};
    }

    if (type === 'scale') {
        const values = answers.map(a => Number(a.value));
        const avg = values.length ? (values.reduce((s, v) => s + v, 0) / values.length) : 0;
        const dist = {};
        for (let i = scaleMin; i <= scaleMax; i++) dist[i] = 0;
        values.forEach(v => { if (dist[v] !== undefined) dist[v]++; });
        return { type, total: answers.length, avg: Math.round(avg * 10) / 10, distribution: dist, scaleMin, scaleMax };
    }

    if (type === 'wordcloud') {
        const freq = {};
        answers.forEach(a => {
            const word = String(a.value).trim().toLowerCase();
            if (word) freq[word] = (freq[word] || 0) + 1;
        });
        return { type, total: answers.length, words: freq };
    }

    if (type === 'open') {
        const list = answers.map(a => ({ text: String(a.value), upvotes: a.upvotes || 0, id: a.participantId }));
        return { type, total: answers.length, answers: list };
    }

    return { type, total: answers.length };
}

function deleteSession(sessionId) {
    return sessions.delete(sessionId);
}

module.exports = {
    users, sessions,
    createUser, findUserByEmail, findUserById,
    createSession, getSessionByCode, getSessionById, getSessionsByOwner,
    addQuestion, getQuestion, recordAnswer, computeResults,
    deleteSession,
};
