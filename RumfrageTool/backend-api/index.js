const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const amqp = require('amqplib');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const JWT_SECRET = process.env.JWT_SECRET || 'geheimes-uni-projekt-jwt-secret-2026';
const QUEUE_NAME = 'survey_events';

// --- 1. Globale Express-Middlewares ---
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true
  })
);

// --- 2. PostgreSQL Datenbank-Pool ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// --- 3. RabbitMQ Producer (Sender) ---
let rabbitChannel = null;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    rabbitChannel = await connection.createChannel();
    await rabbitChannel.assertQueue(QUEUE_NAME, { durable: true });
    console.log('[API] Erfolgreich mit RabbitMQ verbunden.');
  } catch (error) {
    console.error('[API] RabbitMQ Fehler, neuer Versuch in 5s:', error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
}

function publishEvent(action, payload) {
  if (!rabbitChannel) return;
  const message = JSON.stringify({ action, payload });
  rabbitChannel.sendToQueue(QUEUE_NAME, Buffer.from(message), { persistent: true });
}

// --- 4. Eigene Auth-Middleware (Türsteher für geschützte Routen) ---
function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Bitte logge dich ein, um diese Aktion auszuführen.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token.' });
  }
}

function setAuthCookie(res, user) {
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '24h'
  });

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  });
}

// --- 5. Healthcheck-Endpunkt ---
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// --- 6. Authentifizierungs-Routen ---

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || username.trim().length < 3 || password.length < 4) {
    return res.status(400).json({
      error: 'Benutzername (mind. 3 Zeichen) und Passwort (mind. 4 Zeichen) erforderlich.'
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username.trim(), passwordHash]
    );

    const newUser = result.rows[0];
    setAuthCookie(res, newUser);
    publishEvent('USER_REGISTERED', { userId: newUser.id, username: newUser.username });

    res.status(201).json({ user: newUser });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
    }
    res.status(500).json({ error: 'Serverfehler bei der Registrierung.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Bitte Benutzername und Passwort eingeben.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Ungültige Zugangsdaten.' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Ungültige Zugangsdaten.' });
    }

    const userData = { id: user.id, username: user.username };
    setAuthCookie(res, userData);
    publishEvent('USER_LOGIN', { userId: user.id, username: user.username });

    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ error: 'Serverfehler beim Login.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Erfolgreich ausgeloggt.' });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ user: null });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: { id: decoded.id, username: decoded.username } });
  } catch (error) {
    res.json({ user: null });
  }
});

// --- 7. CRUD-Routen für Umfragen (Surveys) ---

// READ: Alle Umfragen abrufen (inkl. Ersteller-Name per LEFT JOIN)
app.get('/api/surveys', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, COALESCE(u.username, 'System-Beispieldaten') AS author
      FROM surveys s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC, s.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Umfragen.' });
  }
});

// CREATE: Neue Umfrage anlegen (Geschützt durch requireAuth)
app.post('/api/surveys', requireAuth, async (req, res) => {
  const { title, option_a, option_b } = req.body;

  if (!title || !option_a || !option_b || !title.trim() || !option_a.trim() || !option_b.trim()) {
    return res.status(400).json({ error: 'Titel sowie Option A und Option B sind Pflichtfelder.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO surveys (title, option_a, option_b, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title.trim(), option_a.trim(), option_b.trim(), req.user.id]
    );

    const created = result.rows[0];
    publishEvent('SURVEY_CREATED', {
      surveyId: created.id,
      title: created.title,
      byUser: req.user.username
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen der Umfrage.' });
  }
});

// UPDATE (Edit): Umfrage bearbeiten (Geschützt durch requireAuth)
app.put('/api/surveys/:id', requireAuth, async (req, res) => {
  const surveyId = Number(req.params.id);
  const { title, option_a, option_b } = req.body;

  if (!title || !option_a || !option_b || !title.trim() || !option_a.trim() || !option_b.trim()) {
    return res.status(400).json({ error: 'Titel sowie Option A und Option B dürfen nicht leer sein.' });
  }

  try {
    const result = await pool.query(
      `UPDATE surveys
       SET title = $1, option_a = $2, option_b = $3
       WHERE id = $4
       RETURNING *`,
      [title.trim(), option_a.trim(), option_b.trim(), surveyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Umfrage nicht gefunden.' });
    }

    const updated = result.rows[0];
    publishEvent('SURVEY_UPDATED', {
      surveyId: updated.id,
      newTitle: updated.title,
      byUser: req.user.username
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Umfrage.' });
  }
});

// UPDATE (Vote): Für Option A oder B abstimmen (Öffentlich für gute UX)
app.post('/api/surveys/:id/vote', async (req, res) => {
  const surveyId = Number(req.params.id);
  const { option } = req.body;

  if (option !== 'a' && option !== 'b') {
    return res.status(400).json({ error: 'Ungültige Abstimmungs-Option (nur "a" oder "b" erlaubt).' });
  }

  // Da wir oben strikt auf 'a' oder 'b' geprüft haben, ist der Spaltenname 100% sicher
  const column = option === 'a' ? 'votes_a' : 'votes_b';

  try {
    const result = await pool.query(
      `UPDATE surveys SET ${column} = ${column} + 1 WHERE id = $1 RETURNING *`,
      [surveyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Umfrage nicht gefunden.' });
    }

    const updated = result.rows[0];
    publishEvent('SURVEY_VOTED', { surveyId: updated.id, votedOption: option.toUpperCase() });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abstimmen.' });
  }
});

// DELETE: Umfrage löschen (Geschützt durch requireAuth)
app.delete('/api/surveys/:id', requireAuth, async (req, res) => {
  const surveyId = Number(req.params.id);

  try {
    const result = await pool.query('DELETE FROM surveys WHERE id = $1 RETURNING id, title', [
      surveyId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Umfrage nicht gefunden.' });
    }

    const deleted = result.rows[0];
    publishEvent('SURVEY_DELETED', {
      surveyId: deleted.id,
      title: deleted.title,
      byUser: req.user.username
    });

    res.json({ message: 'Umfrage erfolgreich gelöscht.', id: deleted.id });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen der Umfrage.' });
  }
});

// --- 8. Server starten ---
app.listen(PORT, () => {
  console.log(`[API] Haupt-Backend läuft auf Port ${PORT}`);
  connectRabbitMQ();
});