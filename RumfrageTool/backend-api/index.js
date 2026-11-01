const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const amqp = require('amqplib');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const net = require('net');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const JWT_SECRET = process.env.JWT_SECRET || 'geheimes-uni-projekt-jwt-secret-2026';
const QUEUE_NAME = 'survey_events';

// --- Datei-Upload: Verzeichnisse & Multer-Konfiguration ---
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const TEMP_DIR = path.join(UPLOAD_DIR, 'tmp');
const CLEAN_DIR = path.join(UPLOAD_DIR, 'clean');

fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(CLEAN_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

const storage = multer.diskStorage({
  destination: TEMP_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF, JPG und PNG sind erlaubt.'));
    }
  }
});

// --- ClamAV-Scan über rohe TCP-Verbindung (clamd INSTREAM-Protokoll) ---
const CLAMAV_HOST = process.env.CLAMAV_HOST || 'clamav';
const CLAMAV_PORT = Number(process.env.CLAMAV_PORT) || 3310;

let clamavAvailable = false;

// Verbindungstest per PING/PONG
async function testClamAV() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(CLAMAV_PORT, CLAMAV_HOST);
    socket.setTimeout(5000);
    socket.on('connect', () => socket.write('zPING\0'));
    socket.on('data', (data) => {
      if (data.toString().includes('PONG')) {
        socket.destroy();
        resolve();
      }
    });
    socket.on('error', reject);
    socket.on('timeout', () => { socket.destroy(); reject(new Error('Timeout')); });
  });
}

async function connectClamAV() {
  try {
    await testClamAV();
    clamavAvailable = true;
    console.log('[API] Erfolgreich mit ClamAV verbunden.');
  } catch (err) {
    clamavAvailable = false;
    console.error('[API] ClamAV nicht erreichbar, neuer Versuch in 15s:', err.message);
    setTimeout(connectClamAV, 15000);
  }
}

// Datei per INSTREAM-Befehl an clamd senden und Ergebnis zurückgeben
async function scanWithClamAV(filePath) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(CLAMAV_PORT, CLAMAV_HOST);
    let response = '';
    socket.setTimeout(30000);

    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('data', (chunk) => {
        const sizeBuf = Buffer.alloc(4);
        sizeBuf.writeUInt32BE(chunk.length, 0);
        socket.write(sizeBuf);
        socket.write(chunk);
      });
      fileStream.on('end', () => {
        const endBuf = Buffer.alloc(4); // 4 Null-Bytes = Ende des Streams
        socket.write(endBuf);
      });
      fileStream.on('error', reject);
    });

    socket.on('data', (data) => { response += data.toString(); });
    socket.on('end', () => {
      if (response.includes('FOUND')) {
        const virus = response.replace('stream: ', '').replace(' FOUND', '').trim();
        resolve({ isInfected: true, virus });
      } else if (response.includes('OK')) {
        resolve({ isInfected: false, virus: null });
      } else {
        reject(new Error(`Unbekannte ClamAV-Antwort: ${response}`));
      }
    });
    socket.on('error', reject);
    socket.on('timeout', () => { socket.destroy(); reject(new Error('ClamAV Timeout')); });
  });
}

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

// READ: Alle Umfragen abrufen (inkl. Ersteller-Name und angehängter Dateien)
app.get('/api/surveys', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*,
        COALESCE(u.username, 'System-Beispieldaten') AS author,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sf.id,
              'original_name', sf.original_name,
              'mime_type', sf.mime_type,
              'uploaded_at', sf.uploaded_at
            ) ORDER BY sf.uploaded_at DESC
          ) FILTER (WHERE sf.id IS NOT NULL),
          '[]'::json
        ) AS files
      FROM surveys s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN survey_files sf ON sf.survey_id = s.id
      GROUP BY s.id, u.username
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

  // Voter-Token: immer das stabile Browser-Cookie, unabhängig vom Login-Status
  let voterToken = req.cookies.voter_id;
  if (!voterToken) {
    voterToken = crypto.randomUUID();
    res.cookie('voter_id', voterToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 365 * 24 * 60 * 60 * 1000 // 1 Jahr
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const surveyCheck = await client.query('SELECT id FROM surveys WHERE id = $1', [surveyId]);
    if (surveyCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Umfrage nicht gefunden.' });
    }

    // Atomares Einfügen: bei Duplikat wird nichts eingefügt (kein Fehler, aber auch kein Datensatz)
    const voteInsert = await client.query(
      'INSERT INTO survey_votes (survey_id, voter_token) VALUES ($1, $2) ON CONFLICT (survey_id, voter_token) DO NOTHING RETURNING id',
      [surveyId, voterToken]
    );
    if (voteInsert.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Du hast bei dieser Umfrage bereits abgestimmt.' });
    }

    const result = await client.query(
      `UPDATE surveys SET ${column} = ${column} + 1 WHERE id = $1 RETURNING *`,
      [surveyId]
    );

    await client.query('COMMIT');

    const updated = result.rows[0];
    publishEvent('SURVEY_VOTED', { surveyId: updated.id, votedOption: option.toUpperCase() });

    res.json(updated);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Fehler beim Abstimmen.' });
  } finally {
    client.release();
  }
});

// DELETE: Umfrage löschen (Geschützt durch requireAuth)
app.delete('/api/surveys/:id', requireAuth, async (req, res) => {
  const surveyId = Number(req.params.id);

  try {
    // Dateinamen vor dem DB-Löschen abfragen, da CASCADE die Einträge sonst entfernt
    const filesResult = await pool.query(
      'SELECT stored_name FROM survey_files WHERE survey_id = $1',
      [surveyId]
    );

    const result = await pool.query('DELETE FROM surveys WHERE id = $1 RETURNING id, title', [
      surveyId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Umfrage nicht gefunden.' });
    }

    // Physische Dateien erst nach erfolgreichem DB-Löschen entfernen;
    // fehlende oder nicht löschbare Dateien werden nur geloggt
    for (const row of filesResult.rows) {
      const storedName = path.basename(row.stored_name);
      const filePath = path.join(CLEAN_DIR, storedName);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.error(`[API] Datei konnte nicht gelöscht werden: ${filePath}:`, fileErr.message);
      }
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

// --- 8. Datei-Upload und -Download für Umfragen ---

// UPLOAD: Datei zu einer Umfrage hochladen (Geschützt durch requireAuth)
app.post('/api/surveys/:id/upload', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
  }

  const surveyId = Number(req.params.id);
  const tempPath = req.file.path;

  if (!clamavAvailable) {
    fs.unlinkSync(tempPath);
    return res.status(503).json({ error: 'Virenscanner nicht verfügbar. Bitte später erneut versuchen.' });
  }

  try {
    const surveyCheck = await pool.query('SELECT id FROM surveys WHERE id = $1', [surveyId]);
    if (surveyCheck.rows.length === 0) {
      fs.unlinkSync(tempPath);
      return res.status(404).json({ error: 'Umfrage nicht gefunden.' });
    }

    // ClamAV-Scan
    const { isInfected, virus } = await scanWithClamAV(tempPath);

    if (isInfected) {
      fs.unlinkSync(tempPath);
      publishEvent('FILE_BLOCKED', { surveyId, virus, byUser: req.user.username });
      return res.status(422).json({ error: `Datei blockiert: Schadsoftware erkannt (${virus}).` });
    }

    // Saubere Datei in das finale Verzeichnis verschieben
    const cleanPath = path.join(CLEAN_DIR, req.file.filename);
    fs.renameSync(tempPath, cleanPath);

    const dbResult = await pool.query(
      `INSERT INTO survey_files (survey_id, original_name, stored_name, mime_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [surveyId, req.file.originalname, req.file.filename, req.file.mimetype]
    );

    publishEvent('FILE_UPLOADED', {
      surveyId,
      fileName: req.file.originalname,
      byUser: req.user.username
    });

    res.status(201).json(dbResult.rows[0]);
  } catch (err) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error('[API] Upload-Fehler:', err.message);
    res.status(500).json({ error: 'Fehler beim Verarbeiten der Datei.' });
  }
});

// DOWNLOAD / PREVIEW: Saubere Datei ausliefern (öffentlich)
app.get('/api/files/:id', async (req, res) => {
  const fileId = Number(req.params.id);
  try {
    const result = await pool.query('SELECT * FROM survey_files WHERE id = $1', [fileId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Datei nicht gefunden.' });
    }

    const file = result.rows[0];
    // path.basename verhindert Path-Traversal-Angriffe
    const storedName = path.basename(file.stored_name);
    const filePath = path.join(CLEAN_DIR, storedName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Datei nicht mehr vorhanden.' });
    }

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden der Datei.' });
  }
});

// --- 9. Server starten ---
app.listen(PORT, () => {
  console.log(`[API] Haupt-Backend läuft auf Port ${PORT}`);
  connectRabbitMQ();
  connectClamAV();
});