# 01 – Zeitlicher Ablauf WebApp

## Ziel

Die WebApp wird schrittweise aufgebaut, sodass zuerst das Grundgerüst funktioniert und danach Datenbank, Authentifizierung, RabbitMQ, Docker und Qualität ergänzt werden.

Die empfohlene Zielarchitektur:

```text
SvelteKit
   ↓
Express REST API
   ↓
PostgreSQL

Express REST API
   ↓
RabbitMQ
   ↓
Logging-Service

Alles gemeinsam über Docker Compose
```

---

# Phase 1 – Projektbasis festlegen

## Schritt 1 – Projektstruktur anlegen

Ziel:
- gemeinsames Grundgerüst
- klare Trennung von Frontend, Backend und Services
- noch keine komplizierte Logik

Geplante Struktur:

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

**Ergebnis:** Jeder weiß, wo später welcher Teil liegt.

---

# Phase 2 – Frontend-Grundgerüst

## Schritt 2 – SvelteKit erstellen

Ziel:
- SvelteKit-Projekt läuft
- erste Seiten und Navigation vorhanden
- noch keine echte Datenbank notwendig

Erste Seiten:

```text
/
├── Login
├── Registrieren
├── Dashboard
├── Umfrage erstellen
├── Umfrage bearbeiten
├── Teilnahme
└── Ergebnisse
```

**Ergebnis:** Die WebApp lässt sich im Browser öffnen und man kann zwischen den wichtigsten Seiten navigieren.

---

# Phase 3 – Backend-Grundgerüst

## Schritt 3 – Express API erstellen

Ziel:
- eigenes Node.js-/Express-Backend
- erste REST-Endpunkte
- Verbindung zwischen SvelteKit und Backend

Beispiel:

```text
GET    /api/health
POST   /api/auth/register
POST   /api/auth/login

GET    /api/surveys
POST   /api/surveys
PUT    /api/surveys/:id
DELETE /api/surveys/:id
```

Zunächst dürfen Testdaten noch im Backend liegen.

**Ergebnis:** SvelteKit kann Daten über HTTP vom Express-Backend abrufen.

---

# Phase 4 – Kernfunktion Umfragen

## Schritt 4 – Umfrage-CRUD implementieren

Ziel:
- Umfragen anlegen
- Umfragen anzeigen
- Umfragen bearbeiten
- Umfragen löschen

Danach:
- Fragen hinzufügen
- Fragen bearbeiten
- Fragen löschen
- Antwortmöglichkeiten verwalten

**Ergebnis:** Die wichtigste fachliche Funktion der App funktioniert vollständig.

---

# Phase 5 – Datenbank

## Schritt 5 – PostgreSQL einführen

Ziel:
- In-Memory-Daten entfernen
- PostgreSQL verwenden
- Daten bleiben nach Neustart erhalten

Mindestens benötigte Daten:

```text
User
Survey
Question
AnswerOption
Vote
```

Wichtig:
- kein SQLite
- kein lowdb
- kein localStorage als Hauptspeicher
- Datenbank in eigenem Container

**Ergebnis:** Nutzer und Umfragen bleiben dauerhaft gespeichert.

---

# Phase 6 – Authentifizierung

## Schritt 6 – Login und Rechte sauber umsetzen

Ziel:
- registrieren
- anmelden
- abmelden
- Passwort mit bcrypt hashen
- geschützte Routen
- Nutzer dürfen nur eigene Umfragen bearbeiten

Empfohlen:

```text
HttpOnly Cookie
Secure
SameSite
```

**Ergebnis:** Authentifizierung und Autorisierung funktionieren serverseitig.

---

# Phase 7 – Teilnahme und Ergebnisse

## Schritt 7 – Abstimmungen implementieren

Ziel:
- Teilnehmer öffnen eine Umfrage
- beantworten Fragen
- Antworten werden gespeichert
- Ergebnisse werden berechnet

Beispiel:

```text
Umfrage-Code öffnen
→ Frage anzeigen
→ Antwort senden
→ nächste Frage
→ Ergebnis
```

**Ergebnis:** Eine Umfrage kann vollständig durchgeführt werden.

---

# Phase 8 – Zweiter Backend-Service

## Schritt 8 – Logging-Service erstellen

Ziel:
- zweiter eigener Node.js-Service
- bewusst sehr klein halten

Beispiel-Events:

```text
user.registered
survey.created
survey.updated
survey.deleted
vote.submitted
```

Der Service verarbeitet nur Logs bzw. Audit-Ereignisse.

**Ergebnis:** Die Anforderung „mehrere Backend-Services“ ist sinnvoll erfüllt.

---

# Phase 9 – RabbitMQ

## Schritt 9 – Services über RabbitMQ verbinden

Ziel:

```text
Express API
   ↓
RabbitMQ
   ↓
Logging-Service
```

Beispiel:
Beim Erstellen einer Umfrage wird `survey.created` an RabbitMQ gesendet. Der Logging-Service empfängt das Event.

**Ergebnis:** Die geforderte Kommunikation über einen Message Broker funktioniert.

---

# Phase 10 – Docker

## Schritt 10 – Alles containerisieren

Benötigte Container:

```text
frontend
backend
logging-service
postgres
rabbitmq
```

Danach soll nur noch nötig sein:

```bash
docker compose up
```

**Ergebnis:** Das gesamte Projekt startet mit einem einzigen Befehl.

---

# Phase 11 – Konfiguration und Healthchecks

## Schritt 11 – `.env.example` und Healthchecks ergänzen

Beispiel:

```text
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
JWT_SECRET=
RABBITMQ_URL=
DATABASE_URL=
```

Healthchecks mindestens für:

```text
backend
postgres
rabbitmq
```

Optional auch:

```text
frontend
logging-service
```

**Ergebnis:** Die Anwendung ist reproduzierbar startbar und überprüfbar.

---

# Phase 12 – UI und Mobile

## Schritt 12 – Oberfläche finalisieren

Jetzt erst Design sauber machen.

Fokus:
- Mobile First
- verständliche Navigation
- gutes Formular-Design
- klare Fehlermeldungen
- Ladezustände
- Responsive Design

Den KI-Prototyp kann man hier als visuelle Vorlage verwenden.

**Ergebnis:** Die App sieht sauber aus und funktioniert auf Smartphone und Desktop.

---

# Phase 13 – Accessibility und Qualität

## Schritt 13 – Lighthouse und Fehlerfälle

Prüfen:
- Lighthouse Accessibility
- Chrome
- Firefox
- Tastaturbedienung
- Labels
- Kontrast
- Fehlerzustände
- ungültige Eingaben
- Backend nicht erreichbar
- Datenbank nicht erreichbar

**Ergebnis:** Die Anwendung ist stabil und erfüllt die Qualitätsanforderungen.

---

# Phase 14 – Gesamttest

## Schritt 14 – Abgabeablauf einmal komplett testen

Mit frischem Stand:

```bash
git clone ...
cd WebApp
cp .env.example .env
docker compose up
```

Danach testen:

```text
Registrieren
→ Login
→ Umfrage erstellen
→ bearbeiten
→ veröffentlichen
→ teilnehmen
→ Ergebnis sehen
→ löschen
```

Zusätzlich:

```text
RabbitMQ läuft?
Logging-Service empfängt Events?
PostgreSQL speichert dauerhaft?
Healthchecks grün?
```

**Ergebnis:** Der komplette Abgabeweg funktioniert ohne manuelle Sonderlösungen.

---

# Phase 15 – Vorbereitung auf das Interview

## Schritt 15 – Architektur verstehen

Jedes Gruppenmitglied sollte erklären können:

```text
Warum SvelteKit?
Warum Express?
Was ist REST?
Was bedeutet CRUD?
Warum PostgreSQL?
Warum kein SQLite?
Was macht RabbitMQ?
Warum gibt es einen Logging-Service?
Was macht Docker Compose?
Was ist ein Healthcheck?
Wie funktioniert Authentifizierung?
Wie werden Rechte geprüft?
```

Wichtig: Nicht nur den eigenen Code kennen.

**Ergebnis:** Die Anwendung funktioniert und jedes Gruppenmitglied versteht die Architektur.

---

# Empfohlene Reihenfolge kompakt

```text
1. Projektstruktur
2. SvelteKit
3. Express
4. Survey-CRUD
5. PostgreSQL
6. Auth
7. Teilnahme + Ergebnisse
8. Logging-Service
9. RabbitMQ
10. Docker Compose
11. .env + Healthchecks
12. UI/Mobile
13. Accessibility + Fehlerfälle
14. Gesamttest
15. Interviewvorbereitung
```

---

# Grundregel

Nicht zuerst alles gleichzeitig bauen.

```text
Erst:
Frontend ↔ Backend

Dann:
CRUD

Dann:
Datenbank

Dann:
Auth

Dann:
RabbitMQ + zweiter Service

Dann:
Docker

Dann:
Qualität
```

So bleibt das Projekt jederzeit testbar und Fehler lassen sich leichter finden.
