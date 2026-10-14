'use strict';
require('dotenv').config();

const express   = require('express');
const http      = require('http');
const path      = require('path');
const cors      = require('cors');
const { WebSocketServer } = require('ws');

const authRoutes     = require('./routes/auth');
const sessionRoutes  = require('./routes/sessions');
const store          = require('./store/inMemory');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// ── Middleware ────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
    },
    credentials: true,
}));
app.use(express.json());

// Statische Dateien aus dem Frontend-Ordner servieren
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── WebSocket ─────────────────────────────────────────────────
wss.on('connection', (ws) => {
    ws.isAlive = true;

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        if (msg.type === 'JOIN') {
            ws.sessionId = msg.sessionId;
            ws.role = msg.role || 'teilnehmer';

            if (ws.role === 'teilnehmer') {
                const session = store.getSessionById(msg.sessionId);
                if (session) {
                    session.participantCount++;
                    broadcast(msg.sessionId, { type: 'PARTICIPANT_COUNT', count: session.participantCount });
                }
            }
        }

        if (msg.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG' }));
        }
    });

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
        if (ws.sessionId && ws.role === 'teilnehmer') {
            const session = store.getSessionById(ws.sessionId);
            if (session && session.participantCount > 0) {
                session.participantCount--;
                broadcast(ws.sessionId, { type: 'PARTICIPANT_COUNT', count: session.participantCount });
            }
        }
    });

    ws.on('error', () => {});
});

// Heartbeat: Verbindungen bereinigen
const heartbeat = setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => clearInterval(heartbeat));

// Broadcast-Funktion – an alle Clients in einer Session senden
function broadcast(sessionId, data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.sessionId === sessionId && client.readyState === 1) {
            client.send(payload);
        }
    });
}

// Broadcast über app.locals für die Route-Handler verfügbar machen
app.locals.broadcast = broadcast;

// ── Routen ────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/sessions', sessionRoutes);

// SPA-Fallback: alle unbekannten GET-Anfragen → index.html
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Server starten ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Umfrage-Server läuft auf http://localhost:${PORT}`);
});
