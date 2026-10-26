# Projekt-Analyse: RumfrageTool (PulsePoll)

> Analyse nach der Prüfliste in `Hilfseite.md`, Stand 2026-10-26.
> Geprüft: Datei für Datei, kompletter Code der App unter `RumfrageTool/`.

## Kurzfazit vorweg

Das Projekt ist **technisch sauber, vorlesungsnah und erklärbar**. Es erfüllt
praktisch alle offiziellen Projektanforderungen. Es gibt **keine exotischen
Fremd-Frameworks** (kein NestJS, kein Mongo, kein Bootstrap, kein Kafka). Die
wenigen Abweichungen von den Folien sind bewusst, begründbar und im Interview
leicht zu verteidigen.

Die **einzige größere Lücke gegenüber dem Vorlesungsstoff** ist: Es wird **kein
Prisma** verwendet, sondern der native `pg`-Treiber mit handgeschriebenem SQL.
Das ist keine offizielle Projektanforderung, aber Prisma war Vorlesungsthema –
darauf solltet ihr euch für Rückfragen vorbereiten.

---

## 1. Architektur-Überblick

Fünf Container, orchestriert über `RumfrageTool/docker-compose.yml`:

| Service | Image / Build | Rolle | Vorlesung? |
|---|---|---|---|
| `db` | `postgres:16-alpine` (Registry) | Datenbank | ✅ |
| `rabbitmq` | `rabbitmq:3-management-alpine` (Registry) | Message Broker | ✅ |
| `backend-api` | eigenes Dockerfile (Express) | REST-API + CRUD + Auth + RabbitMQ-Producer | ✅ |
| `backend-logger` | eigenes Dockerfile (Node.js) | RabbitMQ-Consumer / Audit-Logging | ✅ |
| `frontend` | eigenes Dockerfile (SvelteKit SSR) | UI | ✅ |

Das ist genau die in der Aufgabenstellung geforderte Aufteilung:
Frontend (JS-Framework) + **mehrere** Node-Backends, die über **RabbitMQ**
kommunizieren, Datenbank in **eigenem Container**.

---

## 2. Vorlesungs-Abdeckung (Prüfliste Abschnitt 30)

| Thema | Im Projekt? | Wo? | Bewertung |
|---|---|---|---|
| HTML (semantisch) | ✅ | `+layout.svelte` (header/main/footer), `+page.svelte` (section/article/h1-h3) | sehr gut |
| CSS | ✅ | ausschließlich Tailwind | sehr gut |
| Flexbox | ✅ | `flex`, `flex-1`, `flex-wrap` im Layout & Karten | ✅ |
| Tailwind | ✅ | `tailwind.config.js`, alle Komponenten | sehr gut, responsive (`sm:`) |
| JavaScript | ✅ | alle `.js`/`.svelte` | sauber, nachvollziehbar |
| DOM/Events | ✅ | `onclick`, `onsubmit`, `bind:value` (Svelte-Events) | ✅ keine Roh-DOM-Manipulation |
| Svelte 5 (Runes) | ✅ | `$state`, `$props`, Snippets `{@render}` | sehr gut – native Event-Handler, **keine** Legacy-Syntax |
| SvelteKit 2 | ✅ | `+page.svelte`, `+layout.svelte`, `+page.server.js` | ✅ |
| Routing (dateibasiert) | ✅ | `src/routes/` | ✅ (nur 1 Route – Scope okay) |
| SSR | ✅ | `+page.server.js` `load()` + `adapter-node` | sehr gut |
| Node.js | ✅ | beide Backends | ✅ |
| Express | ✅ | `backend-api/index.js` | sehr gut |
| REST | ✅ | `/api/surveys`, `/api/auth/*` | sauber, korrekte HTTP-Methoden |
| CRUD | ✅ | Create/Read/Update/Delete auf `surveys` | vollständig |
| Middleware | ✅ | `express.json`, `cookieParser`, `cors`, eigene `requireAuth` | ✅ erklärbar |
| PostgreSQL | ✅ | `db`-Service + `db/init.sql` | sehr gut, separater Container |
| **Prisma** | ❌ | — (stattdessen `pg` + SQL) | **größte Lücke, s.u.** |
| ENV | ✅ | `env.example`, `${VAR:-default}` in Compose, `process.env`, `$env/...` | ✅ |
| Docker | ✅ | 3 eigene Dockerfiles | ✅ |
| Docker Compose | ✅ | `docker-compose.yml` | ✅ `docker compose up` genügt |
| Volumes | ✅ | `pgdata:/var/lib/postgresql/data` | ✅ Daten bleiben erhalten |
| Healthchecks | ✅ | alle Services haben einen echten Check (inkl. `backend-logger`-Heartbeat) | sehr gut |
| RabbitMQ | ✅ | Producer in `backend-api`, Consumer in `backend-logger` | sinnvoll (Audit-Log = erlaubter POC) |

---

## 3. Projektanforderungen (Prüfliste Abschnitt 31 / Aufgabenstellung)

| Anforderung | Erfüllt? | Fundstelle / Anmerkung |
|---|---|---|
| JS-Framework im Frontend | ✅ | Svelte 5 / SvelteKit 2 |
| Node.js Backend | ✅ | Express + Logger |
| mehrere Backend-Services | ✅ | `backend-api` + `backend-logger` (echt getrennt, eigene package.json/Dockerfile) |
| RabbitMQ / Kafka | ✅ | RabbitMQ, durable Queue `survey_events`, persistente Messages, `ack` |
| separate Datenbank (keine embedded) | ✅ | PostgreSQL im eigenen Container – **kein SQLite/lowdb** |
| PostgreSQL | ✅ | `postgres:16-alpine` |
| Prisma | ➖ | **nicht gefordert** in der Aufgabenstellung; Vorlesungsthema, aber nicht genutzt |
| ENV-Konfiguration | ✅ | `env.example` + Compose-Variablen |
| Docker Compose / 1 Befehl | ✅ | `depends_on` mit `service_healthy` → startet geordnet |
| Healthchecks | ✅ | alle Services mit echtem Check; `backend-logger` prüft jetzt per Heartbeat die RabbitMQ-Verbindung |
| persistente Daten | ✅ | Named Volume `pgdata` |
| Entitäten anlegen/bearbeiten/löschen durch mehrere Nutzer | ✅ | Umfragen-CRUD + Registrierung/Login |
| mobile UX | ✅ | responsive Grids, `sm:`-Breakpoints, `viewport`-Meta |
| Chrome / Firefox | ✅ | nur Standard-APIs (`fetch`), keine Browser-spezifischen Aufrufe |
| Barrierefreiheit (Lighthouse) | ✅ (gute Basis) | semantisches HTML, `label`+`for`, `aria-live`, `role=alert/status`, `aria-hidden`, `lang="de"` |
| sichere Authentifizierung | ✅ | bcrypt-Hash, JWT im **HttpOnly**-Cookie, `sameSite=lax`, parametrisierte Queries |
| Kernfunktionen ohne Bugs | ✅ (soweit statisch prüfbar) | CRUD + Vote + Auth-Flow vollständig implementiert |
| Kundenanforderung | ❓ | *noch zu klären* – welche individuelle Zusatzanforderung wurde euch zugewiesen? Prüfen, ob abgedeckt. |

---

## 4. Fremde Technologien (außerhalb der Folien) – Prüfliste Abschnitt 29

Alle sind Standard-Bausteine, keine exotischen Frameworks. Einstufung:

| Technik | Fundstelle | Zweck | Notwendigkeit | Vorlesungs-Alternative | Empfehlung |
|---|---|---|---|---|---|
| `pg` (+ raw SQL) | `backend-api/index.js` | DB-Zugriff | notwendig (DB-Zugriff muss sein) | **Prisma** | behalten **oder** auf Prisma umstellen – Entscheidung begründen |
| `jsonwebtoken` (JWT) | `backend-api/index.js` | Session-Token im Cookie | sinnvoll | Session-Cookie / Lucia / Auth.js | behalten (JWT ist in Prüfliste §23 als Auth-Variante gelistet) |
| `bcryptjs` | `backend-api/index.js` | Passwort-Hashing | notwendig | (in §23 gelistet) | behalten |
| `cookie-parser` | `backend-api/index.js` | Cookies in Express lesen | sinnvoll | manuelles Header-Parsing | behalten (Standard-Middleware) |
| `cors` | `backend-api/index.js` | Cross-Origin Frontend↔API | notwendig (5173→3000) | eigene CORS-Header | behalten |
| `amqplib` | beide Backends | RabbitMQ-Client | notwendig (Anforderung) | – | behalten |
| `@sveltejs/adapter-node` | `svelte.config.js` | SSR im Container lauffähig | notwendig | – | behalten |
| `autoprefixer`/`postcss` | `postcss.config.js` | Tailwind-Buildkette | notwendig für Tailwind | – | behalten |

**Keine** kritischen/unerklärbaren Technologien gefunden. Nichts aus der Liste
der „Alarm“-Kandidaten (Mongo, Sequelize, Drizzle, NestJS, Fastify, Bootstrap,
Material UI, Kafka, Firebase, …) ist im Projekt.

---

## 5. Konkrete Befunde / To-dos (priorisiert)

### 🔴 Wichtig für die Erklärbarkeit / Qualität

1. **Prisma fehlt (größte Vorlesungs-Lücke).**
   `backend-api/index.js` nutzt `new Pool()` + handgeschriebenes SQL
   (`pool.query('SELECT …')`). Prisma war Vorlesungsthema.
   → *Nicht* zwingend ein Fehler (Aufgabenstellung fordert Prisma nicht, raw
   SQL ist sogar transparenter), **aber** bereitet eine Antwort vor: „Warum pg
   statt Prisma?“ Gute Begründung: volle SQL-Kontrolle, kein ORM-Overhead,
   parametrisierte Queries sind sicher, Schema klein. Wenn ihr auf Nummer
   sicher gehen wollt: auf Prisma umstellen (Schema aus `db/init.sql`
   ableitbar). Das ist die einzige ernstzunehmende „fehlende Vorlesungstechnik“.

2. **✅ ERLEDIGT (2026-10-26): `backend-logger`-Healthcheck ist jetzt ein echter Check.**
   Der Logger schreibt nur bei aktiver RabbitMQ-Verbindung alle 10 s einen
   Heartbeat nach `/tmp/logger-heartbeat` (bei Verbindungsabbruch gestoppt +
   Reconnect). Der Healthcheck in `docker-compose.yml` meldet nur „healthy“,
   wenn dieser Heartbeat jünger als 30 s ist. Kein neues Paket (nur Node-`fs`).
   Erkennt damit echte Funktionsfähigkeit statt nur „Node startet“.

3. **✅ ERLEDIGT (2026-10-26): `svelte/legacy`-Import entfernt.**
   `+page.svelte` nutzt jetzt native Svelte-5-Handler
   (`onsubmit={(event) => { event.preventDefault(); … }}`) statt der
   Alt-Syntax-Brücke `import { preventDefault } from 'svelte/legacy'`.
   Build läuft ohne Legacy-Warnungen.

### 🟡 Mittel – im Interview ansprechbar

4. **Keine Besitzer-Prüfung bei Update/Delete.**
   `PUT/DELETE /api/surveys/:id` prüft nur `requireAuth`, nicht ob
   `survey.user_id === req.user.id`. **Jeder** eingeloggte Nutzer kann **jede**
   Umfrage bearbeiten/löschen. Backend-Schutz existiert (Login nötig), aber
   keine Autorisierung auf Objekt-Ebene.
   → Je nach gewünschtem Design okay (kollaboratives Tool) – aber bewusst
   entscheiden und erklären können. Fix wäre eine Zeile: `AND user_id = $…`
   in der WHERE-Klausel.

5. **JWT_SECRET steht im Repo.**
   Sowohl als Fallback in `index.js:13` als auch in `env.example`. Für ein
   Uni-Projekt vertretbar, aber im Interview erwähnen: produktiv käme das
   Secret nur aus der Umgebung, nicht aus dem Code.

6. **Cookie `secure: false`** (`index.js:76`) – korrekt für localhost/HTTP,
   produktiv müsste es `true` (HTTPS) sein. Bewusste Dev-Einstellung.

7. **Kein per-Nutzer-Vote-Schutz.** `POST /…/vote` ist öffentlich und
   unbegrenzt (Mehrfach-Abstimmen möglich). Laut Code bewusst „öffentlich für
   gute UX“. Als Designentscheidung erklärbar.

### 🟢 Gering / optional

8. **Keine automatisierten Tests** vorhanden. Nicht gefordert, aber die
   Prüfliste listet Tests – ehrlich sagen: „manuell getestet“.
9. **Nur eine Route** (Single-Page). Für den geforderten Umfang (CRUD + Auth +
   Voting) ausreichend; mehr Routen würden SvelteKit-Routing stärker zeigen.
10. **Keine SvelteKit Form Actions** – stattdessen Client-`fetch` gegen die
    Express-API. Architektonisch sinnvoll (eigenständige API), aber Form
    Actions waren evtl. Vorlesungsthema → erklären können, warum Client-fetch.

---

## 6. Was besonders gut ist (im Interview betonen)

- **Sauberes SSR:** `+page.server.js` lädt User + Umfragen **parallel**
  (`Promise.all`), reicht das HttpOnly-Cookie serverseitig an Express weiter.
  Erstanzeige kommt ohne Client-Roundtrip. Sehr vorlesungsnah.
- **SQL-Injection-sicher:** durchgängig parametrisierte Queries (`$1, $2 …`).
  Beim dynamischen Vote-Update wird der Spaltenname **über eine Whitelist**
  (`'a'/'b'`) gewählt, nicht aus User-Input interpoliert – mit Kommentar.
- **Korrekte REST-Semantik:** GET/POST/PUT/DELETE passend, sinnvolle
  Statuscodes (201, 400, 401, 404, 409, 500).
- **Echter Microservice-Split:** API und Logger sind getrennte Services mit
  eigener `package.json`/`Dockerfile` – **nicht** künstlich aufgeteilt.
- **RabbitMQ sinnvoll genutzt:** asynchrones Audit-Logging (lose Kopplung) –
  genau der in der Aufgabe erlaubte „Logging-POC“. Reconnect-Logik,
  `durable`/`persistent`/`ack` sind korrekt.
- **Barrierefreiheit von Anfang an:** semantische Tags, `label`/`for`,
  `aria-live`-Statusmeldungen, Fokus-Ringe, `button`-Elemente (keine klickbaren
  `div`s).
- **Gute Healthchecks** bei db (`pg_isready`), rabbitmq (`rabbitmq-diagnostics
  ping`) und backend-api (`/health` fragt echt die DB ab).

---

## 7. Abschlussbericht (Prüfliste Abschnitt 33)

**1. Sehr gut / vorlesungskonform:** SSR, Express-REST-CRUD, PostgreSQL im
eigenen Container mit Volume, RabbitMQ Producer/Consumer, Docker-Compose mit
`service_healthy`-Abhängigkeiten, bcrypt+JWT-Auth, Tailwind-Responsive,
Barrierefreiheit, echter Microservice-Split.

**2. Fehlende Anforderungen:** Praktisch keine. Offener Punkt:
**Kundenanforderung** verifizieren (welche wurde euch zugeteilt?). *(Logger-
Healthcheck wurde am 2026-10-26 zu einem echten Check aufgewertet.)*

**3. Nicht genutzte Vorlesungstechniken (nur wenn sinnvoll):** **Prisma**
(sinnvoll, da Vorlesungsthema). Optional: SvelteKit Form Actions,
`$derived`/`$effect` (nicht nötig – `{@const}` reicht).

**4. Fremde Technologien:** `pg`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`,
`cors`, `amqplib`, `adapter-node`, `postcss/autoprefixer` – alle Standard und
leicht erklärbar.

**5. Kritische (evtl. nicht erklärbare) Fremdtechnologien:** **Keine.**

**6. Unnötige Komplexität:** Keine nennenswerte. *(Der frühere
`svelte/legacy`-Import wurde am 2026-10-26 durch native Svelte-5-Syntax
ersetzt.)*

**7. Ersetzungsvorschläge:** `pg`+SQL → optional Prisma. *(Ersetzung
`svelte/legacy preventDefault` → native `event.preventDefault()` ist bereits
umgesetzt.)*

**8. Projektanforderungen:** siehe Tabelle Abschnitt 3 – nahezu alle ✅
(inkl. Healthchecks), Kundenanforderung ❓.

**9. Die 10 wichtigsten nächsten Änderungen (priorisiert):**

1. **Kundenanforderung klären & nachweisen** (Pflicht – sonst Punktverlust).
2. ~~Logger-Healthcheck zu einem echten Check machen~~ – ✅ **erledigt (2026-10-26)**.
3. **Antwort „pg statt Prisma“** vorbereiten – oder auf Prisma umstellen.
4. ~~`svelte/legacy`-Import durch native Svelte-5-Syntax ersetzen~~ – ✅ **erledigt (2026-10-26)**.
5. **Besitzer-Prüfung** bei PUT/DELETE bewusst entscheiden/dokumentieren.
6. JWT_SECRET-Handling im Interview sauber erklären (nur aus ENV, nie Code).
7. `secure`-Cookie-Flag / Produktion vs. Dev erklären können.
8. Einmal **Lighthouse** (Chrome DevTools) laufen lassen → Accessibility-Score
   als Nachweis screenshotten.
9. In **Firefox + Chrome** je einmal durchklicken (Vote, Login, CRUD).
10. Kurz-Demo-Skript fürs Interview: `docker compose up` → Registrieren →
    Umfrage anlegen → abstimmen → bearbeiten → löschen → RabbitMQ-Log zeigen
    (`docker logs survey-logger`) → RabbitMQ-Dashboard `localhost:15672`.

---

## 8. Grundregel-Check

> „Ein technisch sauberes Projekt, das die Anforderungen erfüllt, möglichst auf
> Vorlesungstechnologien basiert und dessen Code ihr erklären könnt.“

✅ Erfüllt. Das Projekt verwendet **keine** Technik, die ihr nicht erklären
könntet, und baut fast ausschließlich auf Vorlesungsstoff auf. Die einzige
bewusste Abweichung (pg statt Prisma) ist begründbar. Vor dem Kolloquium die
Punkte aus Abschnitt 5 (🔴/🟡) durchgehen – dann seid ihr sattelfest.
