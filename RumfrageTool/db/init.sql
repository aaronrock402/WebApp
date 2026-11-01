-- 1. Tabelle für registrierte Nutzerinnen und Nutzer
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabelle für unsere Entweder-Oder-Umfragen (CRUD-Entität)
CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    option_a VARCHAR(100) NOT NULL,
    option_b VARCHAR(100) NOT NULL,
    votes_a INTEGER DEFAULT 0 NOT NULL,
    votes_b INTEGER DEFAULT 0 NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabelle für hochgeladene Dateien zu Umfragen
CREATE TABLE IF NOT EXISTS survey_files (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    mime_type VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabelle zur Verhinderung von Mehrfachabstimmungen pro Person und Umfrage
CREATE TABLE IF NOT EXISTS survey_votes (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
    voter_token VARCHAR(255) NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(survey_id, voter_token)
);

-- 5. Start-Daten (Seed Data), damit die App beim ersten Start direkt gefüllt aussieht
INSERT INTO surveys (title, option_a, option_b, votes_a, votes_b)
VALUES 
    ('Was grillen wir beim Semester-Abschluss am Freitag?', 'Klassische Bratwurst', 'Grillkäse & Gemüse', 14, 19),
    ('Wann soll das nächste Team-Meeting stattfinden?', 'Montag 10:00 Uhr', 'Donnerstag 14:00 Uhr', 8, 5);