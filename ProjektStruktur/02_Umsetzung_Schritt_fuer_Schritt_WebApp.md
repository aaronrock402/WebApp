# 02 – Umsetzung Schritt für Schritt

## Ziel

Diese Datei beschreibt nicht nur **was** als Nächstes kommt, sondern **wie** jeder Schritt durchgeführt und getestet wird.

Schema:

```text
Schritt
→ Ziel
→ Dateien / Ordner
→ Terminal
→ Umsetzung
→ Test
→ Fertig wenn
```

---

# Schritt 1 – Projektstruktur vorbereiten

## Ziel
Saubere Trennung der Bestandteile.

## Ordner

```text
WebApp/
├── frontend/
├── backend/
├── logging-service/
├── ProjektStruktur/
├── docker-compose.yml
├── .env.example
└── README.md
```

## Terminal

Vom Projekt-Root:

```bash
mkdir -p frontend backend logging-service
touch docker-compose.yml
touch .env.example
```

## Test

```bash
ls
```

## Fertig wenn
- Ordner vorhanden
- Frontend, Backend und Logging-Service getrennt sind

---

# Schritt 2 – SvelteKit-Frontend erstellen

## Ziel
Frontend mit SvelteKit erzeugen.

## Terminal

Im Projekt-Root:

```bash
cd frontend
npm create svelte@latest .
npm install
npm run dev
```

> Falls der aktuelle Svelte-CLI-Befehl bei euch abweicht, den von der installierten Vorlesungs-/Svelte-Version vorgesehenen Projektgenerator verwenden. Entscheidend ist: Es entsteht ein echtes SvelteKit-Projekt.

## Test

Browser:

```text
http://localhost:5173
```

## Erste Dateien

```text
frontend/
├── src/
│   ├── routes/
│   └── lib/
├── package.json
└── svelte.config.js
```

## Erste Seiten

```text
src/routes/+page.svelte
src/routes/login/+page.svelte
src/routes/register/+page.svelte
src/routes/dashboard/+page.svelte
src/routes/surveys/new/+page.svelte
```

## Fertig wenn
- Frontend startet
- Browser zeigt die App
- Navigation zwischen ersten Seiten funktioniert

---

# Schritt 3 – Express-Backend erstellen

## Ziel
Eigenes REST-Backend aufbauen.

## Terminal

```bash
cd backend
npm init -y
npm install express cors dotenv
npm install --save-dev nodemon
```

## Dateien

```text
backend/
├── src/
│   ├── routes/
│   ├── middleware/
│   └── server.js
└── package.json
```

## Erste Route

```text
GET /api/health
```

Antwort:

```json
{
  "status": "ok"
}
```

## Start

```bash
node src/server.js
```

oder mit entsprechendem npm-Script:

```bash
npm run dev
```

## Test

```bash
curl http://localhost:3000/api/health
```

Erwartet:

```json
{"status":"ok"}
```

## Fertig wenn
- Express läuft
- Health-Endpoint antwortet
- Frontend und Backend parallel laufen können

---

# Schritt 4 – Frontend mit Backend verbinden

## Ziel
SvelteKit ruft die Express-API auf.

## Umsetzung

Zunächst beispielsweise:

```js
fetch('http://localhost:3000/api/health')
```

Später API-Adresse über Umgebungsvariable konfigurieren.

## Test

Im Frontend sichtbar machen, ob `/api/health` erfolgreich geladen wurde.

## Fertig wenn

```text
SvelteKit → HTTP → Express
```

funktioniert.

---

# Schritt 5 – Survey-CRUD bauen

## Ziel
Umfragen vollständig verwalten.

## Backend-Routen

```text
GET    /api/surveys
GET    /api/surveys/:id
POST   /api/surveys
PUT    /api/surveys/:id
DELETE /api/surveys/:id
```

Fragen:

```text
POST   /api/surveys/:id/questions
PUT    /api/surveys/:id/questions/:questionId
DELETE /api/surveys/:id/questions/:questionId
```

## Zunächst
Testdaten dürfen vorübergehend noch in Array/Map liegen.

## Test mit curl

Erstellen:

```bash
curl -X POST http://localhost:3000/api/surveys \
  -H "Content-Type: application/json" \
  -d '{"title":"Testumfrage"}'
```

Abrufen:

```bash
curl http://localhost:3000/api/surveys
```

Bearbeiten:

```bash
curl -X PUT http://localhost:3000/api/surveys/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Geänderte Umfrage"}'
```

Löschen:

```bash
curl -X DELETE http://localhost:3000/api/surveys/1
```

## Fertig wenn

```text
Create
Read
Update
Delete
```

funktioniert.

---

# Schritt 6 – PostgreSQL hinzufügen

## Ziel
Persistente Datenbank statt In-Memory.

## Nicht verwenden

```text
SQLite
lowdb
localStorage als Hauptspeicher
```

## Verwenden

```text
PostgreSQL
```

## Docker zunächst nur für PostgreSQL

In `docker-compose.yml` einen PostgreSQL-Service definieren mit:

```text
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
```

## Backend

```bash
cd backend
npm install pg
```

## Tabellen

Mindestens:

```text
users
surveys
questions
answer_options
votes
```

## Test

1. PostgreSQL starten
2. Umfrage erstellen
3. Backend stoppen
4. Backend wieder starten
5. Umfrage erneut abrufen

## Fertig wenn
Die Umfrage nach Neustart noch vorhanden ist.

---

# Schritt 7 – Registrierung und Login

## Ziel
Sichere Authentifizierung.

## Pakete

```bash
cd backend
npm install bcrypt jsonwebtoken cookie-parser
```

## Backend-Routen

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Passwort

```text
Passwort
→ bcrypt hash
→ erst dann Datenbank
```

Nie Klartextpasswörter speichern.

## Session / Token

Empfohlen:

```text
HttpOnly Cookie
SameSite
Secure im Produktionsbetrieb
```

## Rechteprüfung

```text
User A darf Survey von User A ändern.
User B darf Survey von User A NICHT ändern.
```

## Test

- Nutzer A registrieren
- Nutzer B registrieren
- Nutzer A erstellt Umfrage
- Nutzer B versucht diese zu löschen

Erwartet:

```text
403 Forbidden
```

## Fertig wenn
Authentifizierung **und** Autorisierung funktionieren.

---

# Schritt 8 – Teilnahme an Umfragen

## Ziel
Teilnehmer können abstimmen.

## Backend-Routen

Beispiel:

```text
GET  /api/public/surveys/:code
POST /api/public/surveys/:code/votes
GET  /api/surveys/:id/results
```

## Ablauf

```text
Code eingeben
→ Umfrage laden
→ Antwort auswählen
→ Antwort senden
→ speichern
→ Ergebnis berechnen
```

## Test
Mindestens zwei verschiedene Teilnehmer simulieren.

## Fertig wenn
- Antworten gespeichert werden
- Ergebnis korrekt berechnet wird
- mehrere Teilnehmer möglich sind

---

# Schritt 9 – Logging-Service erstellen

## Ziel
Zweiter eigener Node.js-Backend-Service.

## Terminal

```bash
cd logging-service
npm init -y
npm install amqplib dotenv
```

## Dateien

```text
logging-service/
├── src/
│   └── worker.js
└── package.json
```

## Aufgabe

Events empfangen wie:

```text
survey.created
survey.updated
survey.deleted
vote.submitted
```

## Fertig wenn
Der Service unabhängig vom Hauptbackend gestartet werden kann.

---

# Schritt 10 – RabbitMQ einbauen

## Ziel
Backend und Logging-Service kommunizieren über RabbitMQ.

## RabbitMQ
Als eigener Service in `docker-compose.yml`.

## Backend

```bash
cd backend
npm install amqplib
```

Beim Erstellen einer Umfrage:

```text
survey.created
```

publizieren.

## Logging-Service
Event abonnieren und beispielsweise ausgeben:

```text
Received survey.created ...
```

## Test

Starten:

```text
RabbitMQ
Backend
Logging-Service
```

Dann neue Umfrage über API oder Frontend erstellen.

## Fertig wenn

```text
Express → RabbitMQ → Logging-Service
```

nachweisbar funktioniert.

---

# Schritt 11 – Dockerfiles erstellen

## Ziel
Eigene Services containerisieren.

## Dateien

```text
frontend/Dockerfile
backend/Dockerfile
logging-service/Dockerfile
```

## Compose
In `docker-compose.yml` definieren:

```text
frontend
backend
logging-service
postgres
rabbitmq
```

## Test

```bash
docker compose build
docker compose up
```

## Fertig wenn
Alle Services ohne einzelne lokale Startbefehle über Compose laufen.

---

# Schritt 12 – `.env.example` erstellen

## Ziel
Alle benötigten Variablen dokumentieren.

## Beispiel

```env
POSTGRES_DB=webapp
POSTGRES_USER=webapp
POSTGRES_PASSWORD=change-me

DATABASE_URL=postgresql://webapp:change-me@postgres:5432/webapp

JWT_SECRET=change-me

RABBITMQ_URL=amqp://rabbitmq:5672
```

Keine echten Secrets committen.

## Test

```bash
cp .env.example .env
docker compose up
```

## Fertig wenn
Ein anderes Gruppenmitglied anhand der Beispiel-Datei starten kann.

---

# Schritt 13 – Healthchecks ergänzen

## Ziel
Docker erkennt, ob Services wirklich bereit sind.

## Backend

```text
GET /api/health
```

Optional:

```json
{
  "status": "ok",
  "database": "ok",
  "rabbitmq": "ok"
}
```

## Compose
Healthchecks mindestens für:

```text
backend
postgres
rabbitmq
```

## Test

```bash
docker compose ps
```

## Fertig wenn
Die wichtigen Services als gesund angezeigt werden.

---

# Schritt 14 – Oberfläche finalisieren

## Ziel
Jetzt erst Design und UX ausarbeiten.

## Vom KI-Prototyp sinnvoll als Vorlage

```text
Dashboard
Session-Code
Moderatoransicht
Teilnehmeransicht
Ergebnisdarstellung
Fragetypen
```

## Nicht übernehmen

```text
Vanilla-JS-Architektur
In-Memory-Store
geplante SQLite-Lösung
```

## Fokus
- Mobile First
- klare Buttons
- Fehlermeldungen
- Ladezustände
- verständliche Formulare

## Fertig wenn
Alle Kernfunktionen auf Desktop und Mobil gut bedienbar sind.

---

# Schritt 15 – Accessibility testen

## Ziel
Lighthouse-Anforderungen erfüllen.

## Prüfen

```text
Chrome DevTools
→ Lighthouse
→ Accessibility
```

Zusätzlich:
- Buttons mit verständlichem Namen
- Formulare mit `label`
- Bilder mit `alt`
- Tastaturbedienung
- ausreichender Kontrast
- sinnvolle Überschriftenhierarchie

## Fertig wenn
Keine offensichtlichen Accessibility-Probleme mehr vorhanden sind.

---

# Schritt 16 – Browser-Test

## Ziel
Chrome und Firefox funktionieren.

## Testfälle

```text
Registrieren
Login
Umfrage erstellen
Fragen hinzufügen
Bearbeiten
Löschen
Teilnehmen
Ergebnisse ansehen
Logout
```

## Fertig wenn
Keine Kernfunktion browserabhängig kaputtgeht.

---

# Schritt 17 – Frischer Kompletttest

## Ziel
Abgabe aus Sicht des Dozenten testen.

## Terminal

```bash
git clone <repository>
cd WebApp
cp .env.example .env
docker compose up
```

Danach darf keine manuelle Installation der einzelnen Services nötig sein.

## Testablauf

```text
1. Registrierung
2. Login
3. Umfrage erstellen
4. Frage hinzufügen
5. Umfrage bearbeiten
6. Teilnehmer abstimmen lassen
7. Ergebnis öffnen
8. RabbitMQ-Event prüfen
9. Logging-Service prüfen
10. Umfrage löschen
11. Container neu starten
12. Datenpersistenz prüfen
```

## Fertig wenn
Der komplette Ablauf ohne Sonderwissen funktioniert.

---

# Schritt 18 – Git sauber halten

## Vor jeder größeren Änderung

```bash
git status
git fetch origin
```

Auf eigenem Branch arbeiten, z. B.:

```bash
git switch Leon
```

Änderungen:

```bash
git add .
git commit -m "feat: Survey-Erstellung ergänzen"
git push
```

## Vor Merge
- Projekt starten
- Tests durchführen
- keine ungewollten Dateien committen
- kein `.env`
- kein `node_modules`

## Fertig wenn
Der Branch sauber und reproduzierbar ist.

---

# Schritt 19 – Interviewvorbereitung

## Jeder muss erklären können

### Frontend

```text
Was macht Svelte?
Was macht SvelteKit?
Warum verwenden wir SvelteKit?
```

### Backend

```text
Was ist Node.js?
Was ist Express?
Was ist Middleware?
Was ist REST?
Was ist CRUD?
```

### Daten

```text
Warum PostgreSQL?
Warum keine SQLite-Datenbank?
Wie sind die wichtigsten Tabellen verbunden?
```

### Architektur

```text
Warum RabbitMQ?
Was macht der Logging-Service?
Warum mehrere Services?
Was macht Docker Compose?
Was macht ein Healthcheck?
```

### Sicherheit

```text
Wie werden Passwörter gespeichert?
Wie funktioniert Login?
Wie verhindert das Backend fremde Änderungen?
```

## Fertig wenn
Jeder die gesamte Architektur grob erklären kann.

---

# Gesamt-Reihenfolge

```text
01 Projektstruktur
02 SvelteKit
03 Express
04 Frontend ↔ Backend
05 Survey-CRUD
06 PostgreSQL
07 Auth
08 Teilnahme
09 Logging-Service
10 RabbitMQ
11 Dockerfiles
12 .env.example
13 Healthchecks
14 UI
15 Accessibility
16 Browser-Test
17 Gesamttest
18 Git
19 Interview
```

---

# Wichtigste Regel während der Entwicklung

Nach jedem größeren Schritt:

```text
bauen
→ starten
→ testen
→ committen
```

Nicht fünf große Systeme gleichzeitig hinzufügen.

```text
SvelteKit läuft?
JA

Express läuft?
JA

Kommunikation läuft?
JA

CRUD läuft?
JA

Erst dann PostgreSQL.
```

Dadurch bleibt jederzeit klar, welcher Schritt einen Fehler verursacht hat.
