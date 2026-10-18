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

-- 3. Start-Daten (Seed Data), damit die App beim ersten Start direkt gefüllt aussieht
INSERT INTO surveys (title, option_a, option_b, votes_a, votes_b)
VALUES 
    ('Was grillen wir beim Semester-Abschluss am Freitag?', 'Klassische Bratwurst', 'Grillkäse & Gemüse', 14, 19),
    ('Wann soll das nächste Team-Meeting stattfinden?', 'Montag 10:00 Uhr', 'Donnerstag 14:00 Uhr', 8, 5);