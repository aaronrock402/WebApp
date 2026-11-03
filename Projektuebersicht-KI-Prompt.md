# Projektuebersicht und KI-Prompt

Diese Übersicht beschreibt die im Repository erkennbare Architektur des Projekts **PulsePoll** im Ordner `RumfrageTool`. Sie kann als Kontext in einen KI-Chat kopiert werden. Bei konkreten Fragen oder Änderungen sollte die KI die genannten Dateien erneut prüfen und dem aktuellen Quellcode gegenüber dieser Übersicht den Vorrang geben.

## Kurzüberblick

PulsePoll ist eine Webanwendung für Entweder-oder-Umfragen. Besucher können Umfragen ansehen und abstimmen – Mehrfachabstimmungen werden durch ein Browser-Cookie verhindert. Nach Registrierung oder Anmeldung können Nutzer Umfragen anlegen, bearbeiten und löschen sowie Dateien (PDF, JPG, PNG) an Umfragen anhängen. Die Anwendung nutzt serverseitiges Rendering (SSR), eine separate REST-API, PostgreSQL, RabbitMQ für Audit-Events und ClamAV für Datei-Virenscan.

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
│       ├── lib/
│       │   ├── Alert.svelte
│       │   ├── api.js
│       │   └── SurveyList.svelte
│       └── routes/
│           ├── +layout.server.js
│           ├── +layout.svelte
│           ├── +page.svelte               # Dashboard
│           ├── create/
│           │   ├── +page.js
│           │   └── +page.svelte
│           ├── login/
│           │   └── +page.svelte
│           ├── register/
│           │   └── +page.svelte
│           └── surveys/
│               └── +page.svelte
├── backend-api/
│   ├── Dockerfile
│   ├── index.js
│   └── package.json
├── backend-logger/
│   ├── Dockerfile
│   ├── index.js
│   └── package.json
├── documentation                 # zusätzliche, nicht ausführbare Projektnotizen
├── Erweiterungen_Doku            # Änderungsnotizen zu Upload, ClamAV und Abstimmungsschutz
└── Projektuebersicht-KI-Prompt.md
```

Docker Compose definiert zwei benannte Volumes: `pgdata` (PostgreSQL-Daten) und `uploads` (hochgeladene Dateien, eingehängt in `/app/uploads` im `backend-api`-Container).

## Architektur und Datenfluss

- **Frontend:** SvelteKit mit Svelte 5 und Tailwind CSS. Das gemeinsame Layout und die Navigation liegen in `frontend/src/routes/+layout.svelte`. Der zugehörige Server-Load `frontend/src/routes/+layout.server.js` fragt bei jeder Route den eingeloggten Nutzer und alle Umfragen ab und leitet das Browser-Cookie zur Authentifizierungsabfrage weiter. Die Startseite (`/`) ist ein Dashboard; die weiteren Ansichten liegen unter `/surveys`, `/create`, `/login` und `/register`.
- **Browser-Aktionen:** `frontend/src/lib/api.js` stellt die öffentliche API-Basisadresse bereit. Browser-Aufrufe gehen an `PUBLIC_API_URL`; im Compose-Setup ist dies `http://localhost:3000`. Gemeinsame Umfragekarten und Interaktionen liegen in `frontend/src/lib/SurveyList.svelte`; Meldungen werden über `Alert.svelte` dargestellt.
- **Backend:** `backend-api/index.js` ist ein Express-Server. Er stellt Authentifizierungs-, Umfrage-, Datei-Upload- und Healthcheck-Endpunkte bereit, greift mit `pg` auf PostgreSQL zu, veröffentlicht Audit-Events in RabbitMQ und scannt hochgeladene Dateien mit ClamAV über das INSTREAM-TCP-Protokoll.
- **ClamAV:** Läuft als eigenständiger Compose-Service (`clamav/clamav-debian:stable`) und ist nur im Compose-Netzwerk erreichbar. Die API verbindet sich per TCP auf Port 3310; bei Nichtverfügbarkeit wird alle 15 Sekunden ein erneuter Verbindungsversuch unternommen. Compose wartet beim ClamAV-Healthcheck bis zu 180 Sekunden (`start_period`); die API hängt aber nicht mit `depends_on` von ClamAV ab. Ist ClamAV beim Upload noch nicht erreichbar, werden Upload-Anfragen mit `503` abgewiesen.
- **Logger:** `backend-logger/index.js` konsumiert Nachrichten aus der Queue `survey_events` und gibt die Ereignisse in der Container-Konsole aus.
- **Datenbank:** PostgreSQL speichert Nutzer, Umfragen, Abstimmungstoken und Datei-Metadaten. `db/init.sql` legt vier Tabellen an und fügt zwei Beispielumfragen ein. Das Init-Skript wird beim erstmaligen Initialisieren des Datenbank-Volumes ausgeführt.
- **Lokale Orchestrierung:** `docker-compose.yml` verbindet die sechs Services `frontend`, `backend-api`, `backend-logger`, `db`, `rabbitmq` und `clamav`. Container kommunizieren über ihre Compose-Service-Namen. Abhängigkeiten und Healthchecks sind in Compose definiert.

### Verhalten der Anwendung

- Das gemeinsame Layout lädt beim SSR parallel den aktuellen Nutzer (`GET /api/auth/me`) und alle Umfragen (`GET /api/surveys`). Die Daten stehen dadurch in Navigation und Seiten zur Verfügung. Die Startseite zeigt angemeldeten Nutzern eigene Umfragen und Kennzahlen; nicht angemeldete Nutzer sehen Einstiegslinks. `/surveys` zeigt alle Umfragen. `/create`, `/login` und `/register` sind getrennte Ansichten.
- Nach erfolgreichem Login oder Registrierung lädt das Frontend die serverseitigen Layout-Daten erneut und navigiert zum Dashboard. Weitere Aktionen aktualisieren lokale Zustände oder laden Daten erneut, je nach Ansicht.
- Die Umfrageliste ist nach Erstellungszeit absteigend sortiert. Die API liefert zu jeder Umfrage den Autor-Namen und ein `files`-Array der verknüpften Dateien; Umfragen ohne verknüpften Nutzer erhalten den Namen „System-Beispieldaten".
- Stimmen werden als Zähler direkt an der Umfrage gespeichert. Die Prozentanzeige wird aus `votes_a` und `votes_b` berechnet und gerundet. Bei null Stimmen zeigt das Frontend für beide Optionen 50 % an.
- Registrierung und Login setzen ein signiertes JWT im Cookie `token`. Das Cookie ist `HttpOnly`, hat `SameSite=Lax` und eine Laufzeit von 24 Stunden. Im aktuellen Code ist `secure: false`.
- Für Browser-Aufrufe zur API verwendet das Frontend `credentials: 'include'` bei Authentifizierung sowie geschützten Schreibaktionen und Abstimmungen. CORS erlaubt die konfigurierte `FRONTEND_URL` mit Credentials.
- Das UI verwendet derzeit den Produktnamen „Umfrageheld“; „PulsePoll“ ist der technische Projektname in dieser Übersicht. Laut `Erweiterungen_Doku` wurde die Startseite bereits aufgeräumt; weiterer UI-Polish ist dort als noch geplant vermerkt.

### Mehrfachabstimmungsschutz

Beim ersten Abstimmungs-Request eines Browsers setzt die API ein `HttpOnly`-Cookie `voter_id` (zufällige UUID, Laufzeit 1 Jahr, `SameSite=Lax`, `secure: false`). Dieses Token wird zusammen mit der `survey_id` in die Tabelle `survey_votes` eingetragen, die einen `UNIQUE(survey_id, voter_token)`-Constraint hat. Die gesamte Abstimmungslogik (Prüfung auf Duplikat, Zähler-Update) läuft in einer einzigen DB-Transaktion. Ein Duplikat-Eintrag wird mit `ON CONFLICT DO NOTHING` atomar behandelt und führt zur Antwort `409`. Das RabbitMQ-Event `SURVEY_VOTED` wird erst nach erfolgreichem `COMMIT` veröffentlicht. Praktisch gilt: eine Stimme pro Browserprofil und Umfrage. Ein anderes Gerät, ein anderer Browser, der Inkognito-Modus oder gelöschte Cookies können technisch erneut abstimmen.

### Datei-Upload-Funktion

- Upload über `POST /api/surveys/:id/upload` (Anmeldung erforderlich); erwartet `multipart/form-data` mit dem Feld `file`.
- Erlaubte Dateitypen: PDF, JPG, PNG (MIME-Type und Dateiendung werden geprüft). Maximale Dateigröße: 10 MB.
- Die Datei wird zunächst temporär in `uploads/tmp/` gespeichert (Dateiname: zufällige UUID).
- Ist ClamAV nicht verfügbar, wird die temporäre Datei sofort gelöscht und mit `503` geantwortet.
- ClamAV scannt die Datei per INSTREAM-TCP-Protokoll. Infizierte Dateien werden gelöscht und mit `422` und dem Viren-Namen abgewiesen; das Event `FILE_BLOCKED` wird an RabbitMQ gesendet.
- Saubere Dateien werden nach `uploads/clean/` verschoben und in `survey_files` registriert.
- Download/Inline-Preview: `GET /api/files/:id` ist öffentlich und liefert die Datei mit `Content-Disposition: inline` und korrektem MIME-Type. `path.basename` verhindert Path-Traversal-Angriffe.
- Beim Löschen einer Umfrage (`DELETE /api/surveys/:id`) werden zuerst die `stored_name`-Werte aus `survey_files` gelesen, die Umfrage inklusive zugehöriger Einträge per `ON DELETE CASCADE` aus der DB entfernt und anschließend die physischen Dateien aus `uploads/clean/` gelöscht. Nicht vorhandene oder nicht löschbare Dateien werden nur geloggt.
- Beim Anlegen einer Umfrage ist ein Datei-Anhang optional. Scheitert der Upload danach, ist die Umfrage bereits angelegt; die Erstellungsansicht vermeidet bei erneutem Absenden eine zweite Umfrage und ermöglicht, den fehlgeschlagenen Upload erneut zu versuchen.

### URLs und Ports im Compose-Setup

| Dienst | Adresse vom Host |
|---|---|
| Webanwendung | `http://localhost:5173` |
| REST-API | `http://localhost:3000` |
| RabbitMQ-Verwaltungsoberfläche | `http://localhost:15672` |
| PostgreSQL | `localhost:5432` |
| RabbitMQ AMQP | `localhost:5672` |

Das Frontend nutzt serverseitig zusätzlich `INTERNAL_API_URL=http://backend-api:3000`, damit der SvelteKit-Server die API im Compose-Netzwerk erreicht. `ORIGIN` und `HOST` sind für den Frontend-Container gesetzt. ClamAV ist nur intern erreichbar (kein Host-Port exponiert).

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
| `CLAMAV_HOST` | Hostname des ClamAV-Dienstes für die API | `clamav` (Compose-Service-Name) |
| `CLAMAV_PORT` | TCP-Port von clamd | `3310` |
| `UPLOAD_DIR` | Basisverzeichnis für temporäre und saubere Uploads im API-Container | `/app/uploads` |

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

- Alle Umfragen einschließlich Autorenname und verknüpfter Dateien abrufen: `GET /api/surveys`
- Neue Umfrage anlegen (Anmeldung erforderlich): `POST /api/surveys`
- Umfrage bearbeiten (Anmeldung erforderlich): `PUT /api/surveys/:id`
- Für Option A oder B abstimmen (öffentlich, Mehrfachabstimmung verhindert): `POST /api/surveys/:id/vote`, Body mit `option: "a"` oder `option: "b"`
- Umfrage löschen inkl. Dateien (Anmeldung erforderlich): `DELETE /api/surveys/:id`
- Datei zu einer Umfrage hochladen (Anmeldung erforderlich): `POST /api/surveys/:id/upload`
- Datei herunterladen/inline anzeigen (öffentlich): `GET /api/files/:id`

Das Frontend aktualisiert nach Aktionen seinen lokalen Zustand, zeigt Status- und Fehlermeldungen an und stellt Stimmenzahlen, Prozentwerte und Ergebnisbalken dar.

### API-Verträge im Überblick

Die API erwartet JSON-Bodies (außer bei Datei-Uploads: `multipart/form-data`). Authentifizierte Requests verwenden das Cookie `token`.

| Methode und Pfad | Zugriff | Eingabe / Ergebnis |
|---|---|---|
| `POST /api/auth/register` | öffentlich | `{ username, password }`; Benutzername nach Trim mindestens 3, Passwort mindestens 4 Zeichen. Bei Erfolg `201`, Nutzerobjekt und Auth-Cookie; bereits verwendeter Name ergibt `409`. |
| `POST /api/auth/login` | öffentlich | `{ username, password }`; bei Erfolg Nutzerobjekt und Auth-Cookie, bei ungültigen Zugangsdaten `401`. |
| `POST /api/auth/logout` | öffentlich | Löscht das Auth-Cookie und liefert eine Bestätigung. |
| `GET /api/auth/me` | öffentlich | Liefert `{ user: { id, username } }` oder `{ user: null }`. |
| `GET /api/surveys` | öffentlich | Liefert ein nach Erstellungsdatum sortiertes Array mit Umfragedaten, `author` und `files`-Array der verknüpften Dateien. |
| `POST /api/surveys` | angemeldet | `{ title, option_a, option_b }`; Pflichtfelder dürfen nach Trim nicht leer sein. Gibt die neu angelegte Umfrage mit `201` zurück. |
| `PUT /api/surveys/:id` | angemeldet | `{ title, option_a, option_b }`; aktualisiert Textfelder und gibt bei unbekannter ID `404` zurück. |
| `POST /api/surveys/:id/vote` | öffentlich | `{ option: "a" }` oder `{ option: "b" }`; setzt bei fehlendem Cookie `voter_id` ein jahresgültiges `HttpOnly`-Cookie. Legt einen Datensatz in `survey_votes` an (atomares `ON CONFLICT DO NOTHING`), inkrementiert den Zähler in einer DB-Transaktion und gibt die aktualisierte Umfrage zurück. Bei Duplikat `409`. `SURVEY_VOTED` wird erst nach erfolgreichem `COMMIT` veröffentlicht. |
| `DELETE /api/surveys/:id` | angemeldet | Löscht die Umfrage, alle `survey_files`-Einträge per `ON DELETE CASCADE` und die physischen Dateien aus dem Dateisystem; bei unbekannter ID `404`. |
| `POST /api/surveys/:id/upload` | angemeldet | `multipart/form-data` mit Feld `file`; erlaubte Typen PDF, JPG, PNG, max. 10 MB. Datei wird temporär gespeichert, mit ClamAV gescannt; saubere Dateien werden in `uploads/clean/` verschoben und in `survey_files` registriert (201). Infizierte Dateien → `422`. ClamAV nicht verfügbar → `503`. |
| `GET /api/files/:id` | öffentlich | Liefert die Datei mit `Content-Disposition: inline` und korrektem MIME-Type. `404` wenn Datei in DB oder Dateisystem nicht vorhanden. |
| `GET /health` | öffentlich | Prüft die Datenbankverbindung und liefert den API-/DB-Status. |

### Datenmodell

- `users`: ID, eindeutiger Benutzername, Passwort-Hash und Erstellungszeitpunkt.
- `surveys`: ID, Titel (bis 255 Zeichen), zwei Antwortoptionen (je bis 100 Zeichen), Stimmenzähler `votes_a`/`votes_b`, optionaler Ersteller (`user_id`) und Erstellungszeitpunkt. Wird ein Nutzer gelöscht, wird `user_id` auf `NULL` gesetzt.
- `survey_files`: ID, `survey_id` (FK auf `surveys`, `ON DELETE CASCADE`), `original_name`, `stored_name` (eindeutig, UUID-basiert), `mime_type` und `uploaded_at`. Speichert Metadaten zu hochgeladenen Dateien; die physischen Dateien liegen in `uploads/clean/`.
- `survey_votes`: ID, `survey_id` (FK auf `surveys`, `ON DELETE CASCADE`), `voter_token` (UUID aus dem `voter_id`-Cookie), `voted_at` und ein `UNIQUE(survey_id, voter_token)`-Constraint zur Verhinderung von Mehrfachabstimmungen.
- Umfragen ohne verknüpften Nutzer (zum Beispiel Seed-Daten) werden als „System-Beispieldaten" angezeigt.

### Ereignisverarbeitung

Die API veröffentlicht `USER_REGISTERED`, `USER_LOGIN`, `SURVEY_CREATED`, `SURVEY_UPDATED`, `SURVEY_VOTED`, `SURVEY_DELETED`, `FILE_UPLOADED` und `FILE_BLOCKED` als JSON-Nachrichten mit `action` und `payload` an die dauerhafte RabbitMQ-Queue `survey_events`. Der Logger liest Nachrichten, schreibt Aktion und Payload in die Container-Konsole und bestätigt sie anschließend. Audit-Ereignisse werden nicht zusätzlich in PostgreSQL gespeichert. Wenn der API-Channel zum Veröffentlichungszeitpunkt fehlt, verwirft `publishEvent` das Ereignis ohne lokale Warteschlange; eine dauerhafte Zustellung ist daher nicht garantiert. `SURVEY_VOTED` wird erst nach erfolgreichem DB-Commit der Abstimmung veröffentlicht.

## Grenzen und wichtige Ist-Zustände

- Abstimmungen sind auf eine Stimme pro Browserprofil und Umfrage begrenzt. Die Identifikation erfolgt über das `voter_id`-Cookie (HttpOnly, 1 Jahr). Ein anderes Gerät, ein anderer Browser, der Inkognito-Modus oder gelöschte Cookies können technisch erneut abstimmen. Parallele Doppelabstimmungen werden durch `UNIQUE(survey_id, voter_token)` und atomare DB-Transaktionen verhindert.
- Die API prüft bei `PUT`, `DELETE` und `POST .../upload` nur, ob ein Nutzer angemeldet ist. Sie prüft **nicht**, ob dieser Nutzer die Umfrage erstellt hat. Die Oberfläche zeigt Bearbeiten/Löschen/Upload für alle Umfragen an, sobald irgendein Nutzer angemeldet ist.
- `db/init.sql` enthält zwei Beispieldatensätze. Das PostgreSQL-Image führt dieses Skript beim erstmaligen Anlegen des Datenbank-Volumes aus; es ist keine wiederholbare Migration. Änderungen am SQL-Skript wirken nicht automatisch auf vorhandene Volumes.
- Die SSR-Load-Funktion liefert bei nicht erfolgreicher API-Antwort leere bzw. anonyme Daten und bei einem Netzwerkfehler ebenfalls `{ user: null, surveys: [] }`; der Fehler wird im Frontend-Server geloggt.
- RabbitMQ ist für Ereignisse vorgesehen, nicht für die Funktion der Umfrageansichten oder Abstimmungen. API- und Logger-Quellcode implementieren einen erneuten Verbindungsversuch beim Verbindungsaufbau, aber keine vollständige Wiederherstellungs-/Zustellgarantie nach jedem späteren Verbindungsabbruch. Das gilt analog für ClamAV (Retry alle 15 s bei Verbindungsverlust).
- Ist ClamAV beim Upload nicht erreichbar, schlägt der Upload mit `503` fehl; die temporäre Datei wird sofort gelöscht.
- `Erweiterungen_Doku` meldet einen Smoke-Test mit Registrierung/Login, Umfrageverwaltung, Abstimmen, Upload, Persistenz, RabbitMQ/Logger und Docker-Services. Dort ist auch festgehalten, dass der Upload-Scan mit der EICAR-Testdatei nicht vollständig end-to-end verifiziert werden konnte; der ClamAV-Scan selbst wurde separat getestet. Das ist dokumentierter Teststatus, keine Garantie für jeden späteren Code-Stand.
- Laut `Erweiterungen_Doku` wurde die Oberfläche bereits überarbeitet; weiterer kleiner UI-Polish ist als geplant notiert und noch keine zugesicherte Funktion.
- Die Compose-Konfiguration enthält Entwicklungszugangsdaten; das JWT-Cookie und das `voter_id`-Cookie werden aktuell mit `secure: false` gesetzt. Vor einem öffentlichen Produktiveinsatz müssen Geheimnisse, HTTPS-/Cookie-Konfiguration und CORS-Origin angepasst und die Zugriffskontrolle fachlich geklärt werden.
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

`docker compose down` lässt die persistenten Volumes `pgdata` und `uploads` bestehen. Ein erneuter Start führt das Initialisierungsskript daher nicht erneut auf einer bereits initialisierten Datenbank aus und vorhandene Upload-Dateien bleiben erhalten. Die Compose-Datei enthält lokale Standardwerte für die Entwicklung; vor einem produktiven Einsatz müssen insbesondere Zugangsdaten, JWT-Schlüssel, Cookie-/HTTPS-Einstellungen und CORS-Origin sicher konfiguriert werden.

## Hinweise für Änderungen

- Server-seitiges Laden des Nutzers und der Umfragen befindet sich in `frontend/src/routes/+layout.server.js`; Navigation und App-Rahmen in `frontend/src/routes/+layout.svelte`.
- Das Frontend verwendet SvelteKit mit Svelte 5, den Node-Adapter und Tailwind CSS. Seiten und gemeinsame Komponenten nutzen Svelte-Runes wie `$state`, `$derived` und `$props`; Styles liegen in `src/app.css`.
- Die Dashboard-Ansicht liegt in `frontend/src/routes/+page.svelte`; alle Umfragen und wiederverwendbare Karten-/Abstimmungs-/Upload-Interaktionen in `frontend/src/routes/surveys/+page.svelte` und `frontend/src/lib/SurveyList.svelte`. Erstellen, Login und Registrierung haben eigene Routen.
- API-Routen, Authentifizierung, Datenbankzugriffe, ClamAV-Scan, Datei-Upload/-Download und RabbitMQ-Publishing befinden sich gemeinsam in `backend-api/index.js`.
- Änderungen am Schema oder an Startdaten gehören in `db/init.sql`. Beachte, dass das Init-Skript bei bestehenden Datenbank-Volumes nicht automatisch erneut ausgeführt wird.
- Für eine neue Funktion sind typischerweise Frontend, API, gegebenenfalls Datenbankschema und Audit-Events gemeinsam zu berücksichtigen.
- Die API verlangt für Anlegen, Bearbeiten, Löschen und Datei-Upload eine Anmeldung, aber prüft keine Eigentümerschaft. Vor einer Änderung der Berechtigungen ist zu klären, ob Umfragen nur von ihren Erstellern verwaltet werden dürfen.
- `documentation` und `Erweiterungen_Doku` enthalten zusätzliche Projektnotizen. Bei Widersprüchen haben der aktuelle Quellcode, `docker-compose.yml` und `db/init.sql` Vorrang vor Beschreibungen; Test- und Statusaussagen in den Notizen sind als dokumentierter Stand zu verstehen.
- Die Package-Skripte definieren kein Testskript. Das Frontend hat ein Build-Skript (`npm run build`); API und Logger stellen jeweils `npm start` bereit.

## Kopierbarer KI-Prompt

> Du bist mein technischer Erklär- und Entwicklungsassistent für das Projekt **PulsePoll**, ein Entweder-oder-Umfragetool. Erkläre mir das Projekt verständlich und präzise auf Deutsch. Nutze die folgende Übersicht als Einstieg, aber prüfe bei konkreten Fragen immer den aktuellen Quellcode. Wenn Übersicht und Code voneinander abweichen, gilt der Code. Erfinde keine Funktionen oder technischen Details; kennzeichne Unsicherheiten ausdrücklich.
>
> **Zweck und Architektur:** Besucher können öffentliche Entweder-oder-Umfragen ansehen und abstimmen (eine Stimme pro Browserprofil). Registrierte Nutzer können Umfragen anlegen, bearbeiten, löschen und Dateien anhängen. Das Projekt liegt im Ordner `RumfrageTool` und besteht aus SvelteKit mit Svelte 5 und SSR, einer Express-REST-API, PostgreSQL, RabbitMQ, einem Node.js-Logger und ClamAV als Virenscanner. Docker Compose startet die sechs Services `frontend`, `backend-api`, `backend-logger`, `db`, `rabbitmq` und `clamav`.
>
> **Wichtige Dateien:**  
> - `docker-compose.yml`: Services, Netzwerke, Ports, Volumes (`pgdata`, `uploads`), Umgebungsvariablen, Healthchecks und Abhängigkeiten.  
> - `frontend/src/routes/+layout.server.js`: SSR lädt `/api/auth/me` und `/api/surveys` parallel und leitet das Browser-Cookie zur Authentifizierungsabfrage weiter.
> - `frontend/src/routes/+layout.svelte`: App-Rahmen, Navigation und responsive Sidebar.
> - `frontend/src/routes/+page.svelte`: Dashboard mit persönlichen Umfragen und Kennzahlen.
> - `frontend/src/routes/surveys/+page.svelte`: Ansicht aller Umfragen.
> - `frontend/src/routes/create/+page.svelte`, `login/+page.svelte`, `register/+page.svelte`: Erstellen, Login und Registrierung.
> - `frontend/src/lib/SurveyList.svelte`: wiederverwendbare Umfragekarten, Stimmen, Datei-Upload und Datei-Liste; `Alert.svelte` zeigt Meldungen; `api.js` zentralisiert die Browser-API-URL.
> - `frontend/src/app.css`, `frontend/tailwind.config.js`: globale Tailwind-Styles und Konfiguration.
> - `backend-api/index.js`: Express-Endpunkte, Authentifizierung, PostgreSQL-Zugriffe, ClamAV-Scan, Datei-Upload/-Download und RabbitMQ-Publishing.
> - `backend-logger/index.js`: Verbraucher der RabbitMQ-Queue `survey_events`; schreibt Ereignisse in die Container-Konsole.
> - `db/init.sql`: Tabellen `users`, `surveys`, `survey_files` und `survey_votes` sowie zwei Seed-Umfragen.
> - `Erweiterungen_Doku` und `documentation`: zusätzliche Änderungs- und Projektnotizen; als Hinweise lesen und bei Konflikten Quellcode/Compose/SQL priorisieren.
> - `frontend/svelte.config.js`, `frontend/vite.config.js`, `package.json` und Dockerfiles: Framework-/Build-Konfiguration, Abhängigkeiten und Containerstart.
>
> **Daten und API:** `users` enthält eindeutige Benutzernamen und Passwort-Hashes. `surveys` enthält Titel, Optionen A/B, zwei Zähler, optional `user_id` und Erstellungszeit. `survey_files` speichert Metadaten zu hochgeladenen Dateien (UUID-Dateiname, Original-Name, MIME-Type). `survey_votes` speichert je einen Datensatz pro Abstimmung mit `UNIQUE(survey_id, voter_token)` zur Duplikatverhinderung. Relevante Routen sind `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/surveys`, `POST /api/surveys`, `PUT /api/surveys/:id`, `POST /api/surveys/:id/vote`, `DELETE /api/surveys/:id`, `POST /api/surveys/:id/upload`, `GET /api/files/:id` und `GET /health`. Erstellen/Bearbeiten erwarten `title`, `option_a`, `option_b`; Abstimmen erwartet `option: "a"` oder `"b"`; Upload erwartet `multipart/form-data` mit Feld `file`.
>
> **Authentifizierung und Ereignisse:** Passwörter werden mit `bcryptjs` gehasht; ein JWT wird als `HttpOnly`-Cookie `token` mit 24 Stunden Laufzeit gesetzt. Die API verlangt Anmeldung für Erstellen, Bearbeiten, Löschen und Datei-Upload, aber aktuell keine Eigentümerschaft der Umfrage. Abstimmungen sind öffentlich, aber auf eine Stimme pro Browserprofil begrenzt: ein `voter_id`-Cookie (HttpOnly, 1 Jahr) dient als Voter-Token; `UNIQUE(survey_id, voter_token)` verhindert Duplikate; bei Duplikat antwortet die API mit `409`. `SURVEY_VOTED` wird erst nach erfolgreichem DB-Commit veröffentlicht. Die API sendet `USER_REGISTERED`, `USER_LOGIN`, `SURVEY_CREATED`, `SURVEY_UPDATED`, `SURVEY_VOTED`, `SURVEY_DELETED`, `FILE_UPLOADED` und `FILE_BLOCKED` als JSON-Events an RabbitMQ; der Logger gibt sie aus. Bei fehlendem API-Channel werden Events nicht lokal zwischengespeichert, und sie werden nicht in PostgreSQL persistiert.
>
> **Datei-Upload:** Erlaubte Typen: PDF, JPG, PNG; max. 10 MB. Dateien werden zunächst nach `uploads/tmp/` gespeichert, dann per INSTREAM-TCP von ClamAV gescannt. Saubere Dateien kommen nach `uploads/clean/`; infizierte werden gelöscht (422). Ist ClamAV nicht verfügbar, schlägt der Upload mit 503 fehl. ClamAV hat in Compose eine Healthcheck-Startfrist von 180 Sekunden, ist aber keine Startabhängigkeit der API; frühe Uploads können deshalb 503 erhalten. Download/Preview über `GET /api/files/:id` ist öffentlich. Beim Löschen einer Umfrage werden die physischen Dateien ebenfalls entfernt. Bei einem fehlgeschlagenen optionalen Upload bleibt die bereits erstellte Umfrage bestehen; erneutes Absenden der Erstellungsansicht soll keine zweite Umfrage anlegen.
>
> **Adressen und Betrieb:** Im Compose-Betrieb ist das Frontend unter `http://localhost:5173`, die API unter `http://localhost:3000`, das RabbitMQ-Dashboard unter `http://localhost:15672` erreichbar. Der SSR-Server verwendet `INTERNAL_API_URL=http://backend-api:3000`; der Browser verwendet `PUBLIC_API_URL=http://localhost:3000`. Container sprechen sich über Compose-Service-Namen an, nicht über `localhost`. `docker compose up --build` startet die Anwendung. `RumfrageTool/db/init.sql` läuft nur bei erstmaliger Initialisierung des Datenbank-Volumes.
>
> **Grenzen, Prüfstatus und Arbeitsweise:** Der Prozentwert ist bei null Stimmen jeweils 50 %. Nutzer können derzeit alle Umfragen bearbeiten/löschen und zu allen Umfragen Dateien hochladen, nicht nur für eigene; diese Berechtigungsregel nicht stillschweigend ändern. `Erweiterungen_Doku` meldet einen Smoke-Test der Hauptfunktionen, aber auch, dass der Upload-Scan mit EICAR nicht vollständig end-to-end geprüft werden konnte; den dokumentierten Status nicht als Garantie für jeden späteren Code-Stand ansehen. Die Compose-Datei enthält Entwicklungsgeheimnisse und Auth- sowie Voter-Cookies haben aktuell `secure: false`; keine Produktionssicherheit unterstellen. Für eine Funktion zuerst den Datenfluss Frontend → API → Datenbank und gegebenenfalls RabbitMQ beschreiben, alle betroffenen Schichten prüfen und auf konkrete Dateien/Endpunkte verweisen. Wenn du Code änderst, nenne passende Prüfungen und offene Einschränkungen. Stelle Rückfragen bei fachlichen Entscheidungen, die nicht aus dem Code hervorgehen. Es gibt in den Package-Skripten kein Testskript. `docker compose ps` zeigt den Status, `docker compose logs -f` die Logs und `docker compose down` hält die Services an.
