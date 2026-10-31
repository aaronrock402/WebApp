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
│   ├── package-lock.json
│   ├── svelte.config.js
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── app.html
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
├── documentation                 # zusätzliche, nicht ausführbare Projektnotizen
└── Projektuebersicht-KI-Prompt.md
```

## Architektur und Datenfluss

- **Frontend:** SvelteKit mit Svelte und Tailwind CSS. Die Hauptroute wird serverseitig geladen. `frontend/src/routes/+page.server.js` fragt beim Backend den eingeloggten Nutzer und die Umfragen ab. Der Cookie des Browser-Requests wird zur Authentifizierungsabfrage weitergeleitet.
- **Browser-Aktionen:** Das Frontend ruft die REST-API auf. Die öffentliche API-Adresse wird über `PUBLIC_API_URL` konfiguriert; im Compose-Setup ist sie `http://localhost:3000`.
- **Backend:** `backend-api/index.js` ist ein Express-Server. Er stellt Authentifizierungs-, Umfrage- und Healthcheck-Endpunkte bereit, greift mit `pg` auf PostgreSQL zu und veröffentlicht Audit-Events in RabbitMQ.
- **Logger:** `backend-logger/index.js` konsumiert Nachrichten aus der Queue `survey_events` und gibt die Ereignisse in der Container-Konsole aus.
- **Datenbank:** PostgreSQL speichert Nutzer und Umfragen. `db/init.sql` legt Tabellen an und fügt zwei Beispielumfragen ein. Das Init-Skript wird beim erstmaligen Initialisieren des Datenbank-Volumes ausgeführt.
- **Lokale Orchestrierung:** `docker-compose.yml` verbindet die fünf Services `frontend`, `backend-api`, `backend-logger`, `db` und `rabbitmq`. Container kommunizieren über ihre Compose-Service-Namen. Abhängigkeiten und Healthchecks sind in Compose definiert.

### Verhalten der Anwendung

- Die Anwendung hat eine zentrale Seite. `+page.server.js` lädt beim SSR parallel den aktuellen Nutzer (`GET /api/auth/me`) und die Umfragen (`GET /api/surveys`). Das Frontend übernimmt diese Werte als initialen Zustand; Aktionen aktualisieren den Zustand anschließend clientseitig, ohne die Seite neu zu laden.
- Die Umfrageliste ist nach Erstellungszeit absteigend sortiert. Die API liefert zu jeder Umfrage den Autor-Namen; Umfragen ohne verknüpften Nutzer erhalten den Namen „System-Beispieldaten“.
- Stimmen werden als Zähler direkt an der Umfrage gespeichert. Die Prozentanzeige wird aus `votes_a` und `votes_b` berechnet und gerundet. Bei null Stimmen zeigt das Frontend für beide Optionen 50 % an.
- Registrierung und Login setzen ein signiertes JWT im Cookie `token`. Das Cookie ist `HttpOnly`, hat `SameSite=Lax` und eine Laufzeit von 24 Stunden. Im aktuellen Code ist `secure: false`.
- Für Browser-Aufrufe zur API verwendet das Frontend `credentials: 'include'` bei Authentifizierung sowie geschützten Schreibaktionen; Abstimmungen sind öffentlich. CORS erlaubt die konfigurierte `FRONTEND_URL` mit Credentials.

### URLs und Ports im Compose-Setup

| Dienst | Adresse vom Host |
|---|---|
| Webanwendung | `http://localhost:5173` |
| REST-API | `http://localhost:3000` |
| RabbitMQ-Verwaltungsoberfläche | `http://localhost:15672` |
| PostgreSQL | `localhost:5432` |
| RabbitMQ AMQP | `localhost:5672` |

Das Frontend nutzt serverseitig zusätzlich `INTERNAL_API_URL=http://backend-api:3000`, damit der SvelteKit-Server die API im Compose-Netzwerk erreicht. `ORIGIN` und `HOST` sind für den Frontend-Container gesetzt.

### Konfiguration

| Variable | Verwendung | Compose-Standard |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Zugangsdaten und Datenbankname; daraus wird `DATABASE_URL` für die API gebildet | `surveyuser`, `surveypass`, `surveydb` |
| `DATABASE_URL` | PostgreSQL-Verbindung der API | intern über `db:5432` |
| `RABBITMQ_URL` | Verbindung von API und Logger mit RabbitMQ | intern über `rabbitmq:5672` |
| `JWT_SECRET` | Signieren und Prüfen der Authentifizierungs-JWTs | unsicherer Entwicklungswert in Compose und API |
| `FRONTEND_URL` | erlaubter CORS-Origin der API | `http://localhost:5173` |
| `PUBLIC_API_URL` | API-Adresse für Browser-Aufrufe | `http://localhost:3000` |
| `INTERNAL_API_URL` | API-Adresse für SSR-Aufrufe innerhalb des Compose-Netzes | `http://backend-api:3000` |
| `PORT`, `HOST`, `ORIGIN` | Laufzeitkonfiguration des Frontends bzw. API-Ports | Frontend `5173`, API `3000`; `HOST=0.0.0.0`, `ORIGIN=http://localhost:5173` |

Die `PUBLIC_API_URL` muss für Browser erreichbar sein; `INTERNAL_API_URL` ist dagegen die Adresse aus dem Frontend-Container. `localhost` innerhalb eines Containers bezeichnet diesen Container selbst und ist daher nicht die Adresse eines anderen Compose-Service. Die Werte in Compose sind Entwicklungsdefaults, keine sicheren Produktionswerte.

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

### API-Verträge im Überblick

Die API erwartet JSON-Bodies. Authentifizierte Requests verwenden das Cookie `token`.

| Methode und Pfad | Zugriff | Eingabe / Ergebnis |
|---|---|---|
| `POST /api/auth/register` | öffentlich | `{ username, password }`; Benutzername nach Trim mindestens 3, Passwort mindestens 4 Zeichen. Bei Erfolg `201`, Nutzerobjekt und Auth-Cookie; bereits verwendeter Name ergibt `409`. |
| `POST /api/auth/login` | öffentlich | `{ username, password }`; bei Erfolg Nutzerobjekt und Auth-Cookie, bei ungültigen Zugangsdaten `401`. |
| `POST /api/auth/logout` | öffentlich | Löscht das Auth-Cookie und liefert eine Bestätigung. |
| `GET /api/auth/me` | öffentlich | Liefert `{ user: { id, username } }` oder `{ user: null }`. |
| `GET /api/surveys` | öffentlich | Liefert ein nach Erstellungsdatum sortiertes Array mit Umfragedaten und `author`. |
| `POST /api/surveys` | angemeldet | `{ title, option_a, option_b }`; Pflichtfelder dürfen nach Trim nicht leer sein. Gibt die neu angelegte Umfrage mit `201` zurück. |
| `PUT /api/surveys/:id` | angemeldet | `{ title, option_a, option_b }`; aktualisiert Textfelder und gibt bei unbekannter ID `404` zurück. |
| `POST /api/surveys/:id/vote` | öffentlich | `{ option: "a" }` oder `{ option: "b" }`; erhöht den passenden Zähler und gibt die aktualisierte Umfrage zurück. |
| `DELETE /api/surveys/:id` | angemeldet | Löscht die Umfrage; bei unbekannter ID `404`. |
| `GET /health` | öffentlich | Prüft die Datenbankverbindung und liefert den API-/DB-Status. |

### Datenmodell

- `users`: ID, eindeutiger Benutzername, Passwort-Hash und Erstellungszeitpunkt.
- `surveys`: ID, Titel (bis 255 Zeichen), zwei Antwortoptionen (je bis 100 Zeichen), Stimmenzähler, optionaler Ersteller und Erstellungszeitpunkt. Wird ein Nutzer gelöscht, wird `user_id` auf `NULL` gesetzt. Es gibt keine separate Tabelle für einzelne Stimmen.
- Umfragen ohne verknüpften Nutzer (zum Beispiel Seed-Daten) werden als „System-Beispieldaten“ angezeigt.

### Ereignisverarbeitung

Die API veröffentlicht `USER_REGISTERED`, `USER_LOGIN`, `SURVEY_CREATED`, `SURVEY_UPDATED`, `SURVEY_VOTED` und `SURVEY_DELETED` als JSON-Nachrichten mit `action` und `payload` an die dauerhafte RabbitMQ-Queue `survey_events`. Der Logger liest Nachrichten, schreibt Aktion und Payload in die Container-Konsole und bestätigt sie anschließend. Audit-Ereignisse werden nicht zusätzlich in PostgreSQL gespeichert. Wenn der API-Channel zum Veröffentlichungszeitpunkt fehlt, verwirft `publishEvent` das Ereignis ohne lokale Warteschlange; eine dauerhafte Zustellung ist daher nicht garantiert.

## Grenzen und wichtige Ist-Zustände

- Stimmen sind anonym und nicht auf eine Stimme pro Person, Browser oder Sitzung begrenzt. Es wird nur der jeweilige Gesamtzähler inkrementiert.
- Die API prüft bei `PUT` und `DELETE` nur, ob ein Nutzer angemeldet ist. Sie prüft **nicht**, ob dieser Nutzer die Umfrage erstellt hat. Die Oberfläche zeigt Bearbeiten/Löschen für alle Umfragen an, sobald irgendein Nutzer angemeldet ist.
- `db/init.sql` enthält zwei Beispieldatensätze. Das PostgreSQL-Image führt dieses Skript beim erstmaligen Anlegen des Datenbank-Volumes aus; es ist keine wiederholbare Migration. Änderungen am SQL-Skript wirken nicht automatisch auf vorhandene Volumes.
- Die SSR-Load-Funktion liefert bei nicht erfolgreicher API-Antwort leere bzw. anonyme Daten und bei einem Netzwerkfehler ebenfalls `{ user: null, surveys: [] }`; der Fehler wird im Frontend-Server geloggt.
- RabbitMQ ist für Ereignisse vorgesehen, nicht für die Funktion der Umfrageansichten oder Abstimmungen. API- und Logger-Quellcode implementieren einen erneuten Verbindungsversuch beim Verbindungsaufbau, aber keine vollständige Wiederherstellungs-/Zustellgarantie nach jedem späteren Verbindungsabbruch.
- Die Compose-Konfiguration enthält Entwicklungszugangsdaten; das JWT-Cookie wird aktuell mit `secure: false` gesetzt. Vor einem öffentlichen Produktiveinsatz müssen Geheimnisse, HTTPS-/Cookie-Konfiguration und CORS-Origin angepasst und die Zugriffskontrolle fachlich geklärt werden.
- Die Package-Skripte definieren kein Testskript. Das Frontend hat ein Build-Skript (`npm run build`); API und Logger stellen jeweils `npm start` bereit.

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
- Das Frontend verwendet SvelteKit mit Svelte 5, den Node-Adapter und Tailwind CSS. `+page.svelte` nutzt Svelte-Runes wie `$state` und `$props`; Layout und globale Tailwind-Direktiven liegen in `+layout.svelte` und `src/app.css`.
- API-Routen, Authentifizierung, Datenbankzugriffe und RabbitMQ-Publishing befinden sich gemeinsam in `backend-api/index.js`.
- Änderungen am Schema oder an Startdaten gehören in `db/init.sql`. Beachte, dass das Init-Skript bei bestehenden Datenbank-Volumes nicht automatisch erneut ausgeführt wird.
- Für eine neue Funktion sind typischerweise Frontend, API, gegebenenfalls Datenbankschema und Audit-Events gemeinsam zu berücksichtigen.
- Die API verlangt für Anlegen, Bearbeiten und Löschen eine Anmeldung, aber prüft keine Eigentümerschaft. Vor einer Änderung der Berechtigungen ist zu klären, ob Umfragen nur von ihren Erstellern verwaltet werden dürfen.
- Die Datei `documentation` enthält zusätzliche Projektnotizen. Bei Widersprüchen haben der aktuelle Quellcode, `docker-compose.yml` und `db/init.sql` Vorrang vor Beschreibungen.
- Die Package-Skripte definieren kein Testskript. Das Frontend hat ein Build-Skript (`npm run build`); API und Logger stellen jeweils `npm start` bereit.

## Kopierbarer KI-Prompt

> Du bist mein technischer Erklär- und Entwicklungsassistent für das Projekt **PulsePoll**, ein Entweder-oder-Umfragetool. Erkläre mir das Projekt verständlich und präzise auf Deutsch. Nutze die folgende Übersicht als Einstieg, aber prüfe bei konkreten Fragen immer den aktuellen Quellcode. Wenn Übersicht und Code voneinander abweichen, gilt der Code. Erfinde keine Funktionen oder technischen Details; kennzeichne Unsicherheiten ausdrücklich.
>
> **Zweck und Architektur:** Besucher können öffentliche Entweder-oder-Umfragen ansehen und abstimmen. Registrierte Nutzer können Umfragen anlegen, bearbeiten und löschen. Das Projekt liegt im Ordner `RumfrageTool` und besteht aus SvelteKit mit Svelte 5 und SSR, einer Express-REST-API, PostgreSQL, RabbitMQ und einem Node.js-Logger. Docker Compose startet die Services `frontend`, `backend-api`, `backend-logger`, `db` und `rabbitmq`.
>
> **Wichtige Dateien:**  
> - `docker-compose.yml`: Services, Netzwerke, Ports, Umgebungsvariablen, Healthchecks und Abhängigkeiten.  
> - `frontend/src/routes/+page.svelte`: Oberfläche, Svelte-State und Browser-Aktionen; Stimmen und Prozentwerte werden dort angezeigt.
> - `frontend/src/routes/+page.server.js`: SSR lädt `/api/auth/me` und `/api/surveys` parallel und leitet das Browser-Cookie zur Authentifizierungsabfrage weiter.
> - `frontend/src/routes/+layout.svelte`, `frontend/src/app.css`, `frontend/tailwind.config.js`: gemeinsames Layout und Styles.
> - `backend-api/index.js`: Express-Endpunkte, Authentifizierung, PostgreSQL-Zugriffe und RabbitMQ-Publishing.
> - `backend-logger/index.js`: Verbraucher der RabbitMQ-Queue `survey_events`; schreibt Ereignisse in die Container-Konsole.
> - `db/init.sql`: Tabellen `users` und `surveys` sowie zwei Seed-Umfragen.
> - `frontend/svelte.config.js`, `frontend/vite.config.js`, `package.json` und Dockerfiles: Framework-/Build-Konfiguration, Abhängigkeiten und Containerstart.
>
> **Daten und API:** `users` enthält eindeutige Benutzernamen und Passwort-Hashes. `surveys` enthält Titel, Optionen A/B, zwei Zähler, optional `user_id` und Erstellungszeit. Es gibt keine Tabelle einzelner Stimmen. Relevante Routen sind `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/surveys`, `POST /api/surveys`, `PUT /api/surveys/:id`, `POST /api/surveys/:id/vote`, `DELETE /api/surveys/:id` und `GET /health`. Erstellen/Bearbeiten erwarten `title`, `option_a`, `option_b`; Abstimmen erwartet `option: "a"` oder `"b"`.
>
> **Authentifizierung und Ereignisse:** Passwörter werden mit `bcryptjs` gehasht; ein JWT wird als `HttpOnly`-Cookie `token` mit 24 Stunden Laufzeit gesetzt. Die API verlangt Anmeldung für Erstellen, Bearbeiten und Löschen, aber aktuell keine Eigentümerschaft der Umfrage. Stimmen sind öffentlich und unbegrenzt; das Frontend aktualisiert die Zähler clientseitig. Die API sendet Authentifizierungs- und Umfrageaktionen als JSON-Events an RabbitMQ; der Logger gibt sie aus. Bei fehlendem API-Channel werden Events nicht lokal zwischengespeichert, und sie werden nicht in PostgreSQL persistiert.
>
> **Adressen und Betrieb:** Im Compose-Betrieb ist das Frontend unter `http://localhost:5173`, die API unter `http://localhost:3000`, das RabbitMQ-Dashboard unter `http://localhost:15672` erreichbar. Der SSR-Server verwendet `INTERNAL_API_URL=http://backend-api:3000`; der Browser verwendet `PUBLIC_API_URL=http://localhost:3000`. Container sprechen sich über Compose-Service-Namen an, nicht über `localhost`. `docker compose up --build` startet die Anwendung. `db/init.sql` läuft nur bei erstmaliger Initialisierung des Datenbank-Volumes.
>
> **Grenzen und Arbeitsweise:** Der Prozentwert ist bei null Stimmen jeweils 50 %. Nutzer können derzeit alle Umfragen bearbeiten/löschen, nicht nur eigene; diese Berechtigungsregel nicht stillschweigend ändern. Die Compose-Datei enthält Entwicklungsgeheimnisse und das Auth-Cookie hat aktuell `secure: false`; keine Produktionssicherheit unterstellen. Für eine Funktion zuerst den Datenfluss Frontend → API → Datenbank und gegebenenfalls RabbitMQ beschreiben, alle betroffenen Schichten prüfen und auf konkrete Dateien/Endpunkte verweisen. Wenn du Code änderst, nenne passende Prüfungen und offene Einschränkungen. Stelle Rückfragen bei fachlichen Entscheidungen, die nicht aus dem Code hervorgehen. Es gibt in den Package-Skripten kein Testskript. `docker compose ps` zeigt den Status, `docker compose logs -f` die Logs und `docker compose down` hält die Services an.
