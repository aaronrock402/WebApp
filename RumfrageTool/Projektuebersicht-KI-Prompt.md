# Projektuebersicht und KI-Prompt

Diese Übersicht beschreibt die im Repository erkennbare Architektur des Projekts **PulsePoll** im Ordner `RumfrageTool`. Sie kann als Kontext in einen KI-Chat kopiert werden. Bei konkreten Fragen oder Änderungen sollte die KI die genannten Dateien erneut prüfen und dem aktuellen Quellcode gegenüber dieser Übersicht den Vorrang geben.

## Kurzüberblick

PulsePoll ist eine Webanwendung für Entweder-oder-Umfragen. Besucher können Umfragen ansehen und abstimmen. Nach Registrierung oder Anmeldung können Nutzer Umfragen anlegen, bearbeiten und löschen. Die Anwendung nutzt serverseitiges Rendering (SSR), eine separate REST-API, PostgreSQL und RabbitMQ für Audit-Events.

## Projektstruktur

```text
RumfrageTool/
├── docker-compose.yml
├── db/
│   └── init.sql
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.css
│       └── routes/
│           ├── +layout.svelte
│           ├── +page.server.js
│           └── +page.svelte
├── backend-api/
│   ├── Dockerfile
│   ├── index.js
│   └── package.json
├── backend-logger/
│   ├── Dockerfile
│   ├── index.js
│   └── package.json
└── documentation
```

## Architektur und Datenfluss

- **Frontend:** SvelteKit mit Svelte und Tailwind CSS. Die Hauptroute wird serverseitig geladen. `frontend/src/routes/+page.server.js` fragt beim Backend den eingeloggten Nutzer und die Umfragen ab. Der Cookie des Browser-Requests wird zur Authentifizierungsabfrage weitergeleitet.
- **Browser-Aktionen:** Das Frontend ruft die REST-API auf. Die öffentliche API-Adresse wird über `PUBLIC_API_URL` konfiguriert; im Compose-Setup ist sie `http://localhost:3000`.
- **Backend:** `backend-api/index.js` ist ein Express-Server. Er stellt Authentifizierungs-, Umfrage- und Healthcheck-Endpunkte bereit, greift mit `pg` auf PostgreSQL zu und veröffentlicht Audit-Events in RabbitMQ.
- **Logger:** `backend-logger/index.js` konsumiert Nachrichten aus der Queue `survey_events` und gibt die Ereignisse in der Container-Konsole aus.
- **Datenbank:** PostgreSQL speichert Nutzer und Umfragen. `db/init.sql` legt Tabellen an und fügt zwei Beispielumfragen ein. Das Init-Skript wird beim erstmaligen Initialisieren des Datenbank-Volumes ausgeführt.
- **Lokale Orchestrierung:** `docker-compose.yml` verbindet die fünf Services `frontend`, `backend-api`, `backend-logger`, `db` und `rabbitmq`. Container kommunizieren über ihre Compose-Service-Namen. Abhängigkeiten und Healthchecks sind in Compose definiert.

### URLs und Ports im Compose-Setup

| Dienst | Adresse vom Host |
|---|---|
| Webanwendung | `http://localhost:5173` |
| REST-API | `http://localhost:3000` |
| RabbitMQ-Verwaltungsoberfläche | `http://localhost:15672` |
| PostgreSQL | `localhost:5432` |
| RabbitMQ AMQP | `localhost:5672` |

Das Frontend nutzt serverseitig zusätzlich `INTERNAL_API_URL=http://backend-api:3000`, damit der SvelteKit-Server die API im Compose-Netzwerk erreicht. `ORIGIN` und `HOST` sind für den Frontend-Container gesetzt.

## Fachliche Funktionen und API

### Authentifizierung

- Registrierung: `POST /api/auth/register`
- Anmeldung: `POST /api/auth/login`
- Abmeldung: `POST /api/auth/logout`
- Aktuellen Nutzer abfragen: `GET /api/auth/me`
- Passwörter werden mit `bcryptjs` gehasht.
- Die API signiert ein JWT und setzt es als `HttpOnly`-Cookie mit einer Laufzeit von 24 Stunden. Geschützte Endpunkte prüfen dieses Cookie mit der Middleware `requireAuth`.

### Umfragen

- Alle Umfragen einschließlich Autorenname abrufen: `GET /api/surveys`
- Neue Umfrage anlegen (Anmeldung erforderlich): `POST /api/surveys`
- Umfrage bearbeiten (Anmeldung erforderlich): `PUT /api/surveys/:id`
- Für Option A oder B abstimmen (öffentlich): `POST /api/surveys/:id/vote`, Body mit `option: "a"` oder `option: "b"`
- Umfrage löschen (Anmeldung erforderlich): `DELETE /api/surveys/:id`

Das Frontend aktualisiert nach Aktionen seinen lokalen Zustand, zeigt Status- und Fehlermeldungen an und stellt Stimmenzahlen, Prozentwerte und Ergebnisbalken dar.

### Datenmodell

- `users`: ID, eindeutiger Benutzername, Passwort-Hash und Erstellungszeitpunkt.
- `surveys`: ID, Titel, zwei Antwortoptionen, Stimmenzähler, optionaler Ersteller und Erstellungszeitpunkt. Wird ein Nutzer gelöscht, wird `user_id` auf `NULL` gesetzt.
- Umfragen ohne verknüpften Nutzer (zum Beispiel Seed-Daten) werden als „System-Beispieldaten“ angezeigt.

### Ereignisverarbeitung

Die API veröffentlicht unter anderem `USER_REGISTERED`, `USER_LOGIN`, `SURVEY_CREATED`, `SURVEY_UPDATED`, `SURVEY_VOTED` und `SURVEY_DELETED` als Nachrichten an die RabbitMQ-Queue `survey_events`. Der Logger liest die Queue aus und bestätigt verarbeitete Nachrichten.

## Starten und Betriebswissen

Im Verzeichnis `RumfrageTool`:

```bash
docker compose up --build
```

Im Hintergrund:

```bash
docker compose up --build -d
```

Status und Logs:

```bash
docker compose ps
docker compose logs -f
```

Anhalten:

```bash
docker compose down
```

`docker compose down` lässt das persistente Datenbank-Volume bestehen. Ein erneuter Start führt das Initialisierungsskript daher nicht erneut auf einer bereits initialisierten Datenbank aus. Die Compose-Datei enthält lokale Standardwerte für die Entwicklung; vor einem produktiven Einsatz müssen insbesondere Zugangsdaten, JWT-Schlüssel, Cookie-/HTTPS-Einstellungen und CORS-Origin sicher konfiguriert werden.

## Hinweise für Änderungen

- Die Hauptoberfläche und ihre Interaktionen befinden sich in `frontend/src/routes/+page.svelte`; das serverseitige initiale Laden in `frontend/src/routes/+page.server.js`.
- API-Routen, Authentifizierung, Datenbankzugriffe und RabbitMQ-Publishing befinden sich gemeinsam in `backend-api/index.js`.
- Änderungen am Schema oder an Startdaten gehören in `db/init.sql`. Beachte, dass das Init-Skript bei bestehenden Datenbank-Volumes nicht automatisch erneut ausgeführt wird.
- Für eine neue Funktion sind typischerweise Frontend, API, gegebenenfalls Datenbankschema und Audit-Events gemeinsam zu berücksichtigen.
- Die API verlangt für Anlegen, Bearbeiten und Löschen eine Anmeldung. Im aktuellen Code wird dabei jedoch nicht geprüft, ob der angemeldete Nutzer die jeweilige Umfrage erstellt hat. Vor einer Änderung der Berechtigungen ist zu klären, ob Umfragen nur von ihren Erstellern verwaltet werden dürfen.
- In den gezeigten Package-Skripten sind Start- und Build-Kommandos enthalten; ein Testskript ist dort nicht definiert.

## Kopierbarer KI-Prompt

> Du bist mein technischer Erklär- und Entwicklungsassistent für das Projekt **PulsePoll**, ein Entweder-oder-Umfragetool. Erkläre mir das Projekt verständlich und präzise auf Deutsch. Nutze die folgende Übersicht als Einstieg, aber prüfe bei konkreten Fragen immer den aktuellen Quellcode. Wenn Übersicht und Code voneinander abweichen, gilt der Code. Erfinde keine Funktionen oder technischen Details; kennzeichne Unsicherheiten ausdrücklich.
>
> **Technischer Aufbau:** Das Projekt liegt im Ordner `RumfrageTool`. Es besteht aus einem SvelteKit-/Svelte-Frontend mit SSR, einer Express-REST-API, einer PostgreSQL-Datenbank, RabbitMQ und einem Node.js-Logger. Docker Compose startet die Services `frontend`, `backend-api`, `backend-logger`, `db` und `rabbitmq`.
>
> **Wichtige Dateien:**  
> - `docker-compose.yml`: Services, Netzwerke, Ports, Umgebungsvariablen, Healthchecks und Abhängigkeiten.  
> - `frontend/src/routes/+page.svelte`: Oberfläche und Browser-Aktionen.  
> - `frontend/src/routes/+page.server.js`: serverseitiges Laden des eingeloggten Nutzers und der Umfragen.  
> - `frontend/src/routes/+layout.svelte` und `frontend/src/app.css`: gemeinsames Layout und Styles.  
> - `backend-api/index.js`: Express-Endpunkte, Cookie-/JWT-Authentifizierung, PostgreSQL-Zugriffe und RabbitMQ-Nachrichten.  
> - `backend-logger/index.js`: Verbraucher der RabbitMQ-Queue `survey_events`.  
> - `db/init.sql`: Tabellen `users` und `surveys` sowie Beispielumfragen.  
> - Die jeweiligen `package.json`- und `Dockerfile`-Dateien beschreiben Abhängigkeiten und Containerstarts der Einzelservices.
>
> **Funktion:** Besucher können Umfragen lesen und ohne Anmeldung abstimmen. Registrierung und Login nutzen Passwort-Hashes und ein JWT in einem HttpOnly-Cookie. Angemeldete Nutzer können Umfragen erstellen, bearbeiten und löschen. Die API veröffentlicht Authentifizierungs- und Umfrageaktionen als Audit-Events in RabbitMQ; der Logger schreibt diese in seine Logs. Die Frontend-Adresse ist im Compose-Betrieb `http://localhost:5173`, die API `http://localhost:3000` und das RabbitMQ-Dashboard `http://localhost:15672`.
>
> **Wichtige Architekturdetails:** Beim SSR fragt `+page.server.js` die API über `INTERNAL_API_URL` ab und leitet den Browser-Cookie für die Nutzerabfrage weiter. Browser-Aufrufe verwenden `PUBLIC_API_URL`. Die Services erreichen einander intern über Compose-Service-Namen. `db/init.sql` läuft nur bei der initialen Einrichtung eines Datenbank-Volumes.
>
> **Arbeitsweise:** Wenn ich nach einer Funktion frage, beschreibe zuerst den Datenfluss durch Frontend, API, Datenbank und gegebenenfalls RabbitMQ. Verweise auf konkrete Dateien und Endpunkte. Wenn du Code ändern sollst, prüfe alle betroffenen Schichten, halte dich an die vorhandenen Muster und nenne anschließend die durchgeführten Prüfungen sowie offene Einschränkungen. Stelle Rückfragen, wenn eine fachliche Entscheidung nicht aus dem Code hervorgeht. Beachte, dass der aktuelle Code bei Umfrageänderungen eine Anmeldung verlangt, aber keine Eigentümerschaft der Umfrage prüft.
>
> **Betrieb:** Im Verzeichnis `RumfrageTool` wird die Anwendung mit `docker compose up --build` gestartet. `docker compose ps` zeigt den Status, `docker compose logs -f` die Logs und `docker compose down` hält die Services an. Die Standardkonfiguration ist für lokale Entwicklung gedacht und nicht ohne Anpassungen produktionsgeeignet.
