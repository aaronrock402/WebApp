# WebApp: Prüfung der Anforderungen und Konfiguration

Stand: 20.10.2026. Geprüft wurden `WebApp(1).zip` und `08_WebProgrammierung.zip` einschließlich der enthaltenen Kursquellen und Projektpläne. Der Projektcode wurde nicht verändert.

## 1. Ergebnis

**Die technische Basis passt weitgehend. Svelte 5 und SvelteKit 2 sind vorhanden. Eine vollständige Erfüllung aller Anforderungen lässt sich noch nicht bestätigen.**

Wesentliche offene Punkte sind fehlende Besitzrechte, Sicherheits- und Validierungslücken, der wirkungslose Logger-Healthcheck, fehlende Ausführungsnachweise sowie die unbekannte zusätzliche Kundenanforderung. Außerdem ist die Anwendung gegenüber eurem eigenen Funktionsplan deutlich vereinfacht.

Die Bewertung unterscheidet zwischen offiziellen Projektpflichten, Erwartungen aus den Vorlesungsfolien, eurem eigenen Plan und zusätzlichen Verbesserungen. Frühere KI-Bewertungen eines Plans sind kein Nachweis für die fertige Implementierung.

## 2. Abgleich mit den Vorgaben

| Bereich | Ergebnis | Begründung |
|---|---|---|
| Svelte 5 | Erfüllt hinsichtlich Version und Syntax | Lockfile und mitgelieferte Installation: **5.57.2**. `$state`, `$props`, `onclick` und Snippets werden verwendet. Beide Komponenten kompilieren für Client und Server ohne Warnungen. |
| SvelteKit 2 | Vorhanden | Lockfile und Installation: **2.70.3**, Node-Adapter **5.5.7**. Keine eigenständige Kit-2-Pflicht im Bewertungsbogen gefunden. |
| JS-Frontend und Node-Backends | Im Code vorhanden | SvelteKit-Frontend, Express-Hauptbackend, separater Node-Logging-Service. |
| Mehrere Nutzer und CRUD | Im Code vorhanden, Rechte fehlerhaft | Registrierung, Login sowie Anlegen, Lesen, Ändern und Löschen von Umfragen sind implementiert. Angemeldete Nutzer können jedoch auch fremde Umfragen verändern. |
| Mehrere eigene Backend-Services | Strukturell erfüllt | `backend-api` und `backend-logger` enthalten eigenen Anwendungscode. Der Logging-POC ist laut Aufgabenstellung zulässig. |
| RabbitMQ oder Kafka | RabbitMQ eingebunden | Producer und Consumer benutzen dieselbe Queue `survey_events`. Tatsächlicher Nachrichtentransport hier nicht im Containerverbund getestet. |
| Separate Datenbank | Strukturell erfüllt | PostgreSQL 16 in eigenem Container; Schema, Beispieldaten und benanntes Datenvolume vorhanden. Keine eingebettete Datenbank. |
| Eigene Dockerfiles und Compose | Vorhanden | Fünf Services sind konfiguriert. Der Compose-Befehl muss im Ordner `RumfrageTool` ausgeführt werden. |
| Start mit einem Befehl | Nicht vollständig nachgewiesen | Compose konfiguriert den Verbund; ein frischer Containerstart war in dieser Prüfumgebung mangels Docker nicht möglich. |
| Umgebungsvariablen | Grundvorgabe erfüllt | Werte sind in Compose enthalten. Zusätzlich existiert `env.example` im Repository-Hauptordner. Die Aufgabe erlaubt ausdrücklich Compose **oder** `.env.example`. |
| Sinnvolle Healthchecks | Teilweise erfüllt | Datenbank, Broker und API besitzen Prüfungen. Der Logger meldet unabhängig von seiner Funktionsfähigkeit Erfolg. |
| Sichere Authentifizierung | Nicht ausreichend | Hashing und HttpOnly-Cookie sind vorhanden; bekanntes Standard-JWT-Secret, sehr kurze Mindestpasswörter und fehlende Begrenzung von Loginversuchen bleiben problematisch. |
| Mobile, Firefox und Chrome | Noch nachzuweisen | Responsive Klassen, Labels und semantische Elemente sind vorhanden. Das ersetzt keine tatsächlichen Tests in beiden Browsern und auf schmalen Ansichten. |
| Lighthouse / Barrierefreiheit | Noch nachzuweisen | Keine Messberichte in der ZIP. Behauptungen von 100 % Barrierefreiheit in `documentation` sind nicht belegt. Kapitel 1 nennt zusätzlich WCAG 2.1. |
| Anforderungen ohne Bugs | Nicht erfüllt | Unbehandelte Typfehler und unzureichende Rechteprüfungen sind konkret festgestellt. |
| Zusätzliche Kundenanforderung | Offen | Die Pflicht ist dokumentiert; ihr konkreter Inhalt ist in den bereitgestellten Unterlagen nicht enthalten. |
| Git-Zugriff, Arbeitsteilung, Interview | Organisatorisch zu prüfen | Die ZIP beweist keinen Zugriff des Dozenten auf das Repository und keine transparente Aufgabenverteilung. |

## 3. Konkrete Fehler und Risiken

### 3.1 Fremde Umfragen lassen sich ändern und löschen — hohe Priorität

**Belege:** `RumfrageTool/backend-api/index.js`, Zeilen 217–248 und 283–305; `frontend/src/routes/+page.svelte`, Zeile 482.

Die Auth-Middleware prüft nur, ob ein gültiges Token vorliegt. Die SQL-Abfragen für Änderungen und Löschungen filtern ausschließlich nach Umfrage-ID, nicht nach dem Eigentümer. Die Oberfläche zeigt die Verwaltungsbuttons ebenfalls jedem angemeldeten Nutzer.

Das widerspricht eurem ausdrücklichen Plan: Nutzer B darf die Umfrage von Nutzer A nicht ändern; erwartet ist eine Ablehnung. Ein bloßes Ausblenden der Buttons genügt nicht. Die Berechtigung muss im Backend geprüft werden; System-Beispieldaten brauchen dabei eine bewusst festgelegte Regel.

**Prüfung:** Originale Route-Handler mit simulierten externen Abhängigkeiten aufgerufen. Eine fremde Umfrage wurde vom Handler mit Status 200 akzeptiert; die protokollierten SQL-Abfragen enthielten keinen Eigentümerfilter. Dies war ein isolierter Handler-Test, kein Test gegen eine echte PostgreSQL-Instanz.

### 3.2 Ungültige Datentypen verursachen unbehandelte Fehler — hohe Priorität

**Belege:** `backend-api/index.js`, Zeilen 94–96, 189–191 und 219–221.

Die API ruft `.trim()` auf, ohne zuvor sicherzustellen, dass die Werte Zeichenketten sind. Diese Validierung steht zudem außerhalb der jeweiligen `try`-Blöcke.

Reproduziert wurden unter anderem:

- Registrierung mit numerischem Benutzernamen: `TypeError: username.trim is not a function`.
- Erstellen mit numerischem Titel: `TypeError: title.trim is not a function`.
- Bearbeiten mit einer Liste als Antwortoption: `TypeError: option_a.trim is not a function`.

Die Handler lehnen damit ihr Promise ab, statt kontrolliert einen Validierungsfehler zu liefern. Das kann bei der eingesetzten Express-4-Architektur bis zum Prozessabbruch führen. Typen, Längen und IDs sollten vor der Verarbeitung validiert werden; die Fehlerbehandlung muss abgelehnte asynchrone Aufrufe erfassen. Zu lange Zeichenketten führen derzeit erst zu Datenbankfehlern statt verständlichen Eingabemeldungen.

### 3.3 Authentifizierung und Konfiguration absichern — hohe Priorität

**Belege:** `backend-api/index.js`, Zeilen 13, 68–78, 93–149; `docker-compose.yml`, Zeile 44.

- Das JWT-Secret besitzt einen bekannten, im Quellcode hinterlegten Standardwert. Wird dieser unverändert verwendet, ist die Vertrauensbasis für die Tokens nicht geheim. Einen eigenen zufälligen Wert verwenden und für einen nichtlokalen Betrieb fehlende Konfiguration nicht stillschweigend ersetzen.
- Mindestpasswortlänge aktuell vier Zeichen. Es gibt keine Begrenzung wiederholter Loginversuche.
- `httpOnly: true`, `sameSite: 'lax'`, bcrypt-Hashing und parametrisierte SQL-Werte sind positive Grundlagen.
- `secure: false` ist für die lokale HTTP-Demo erklärbar; für einen Betrieb über HTTPS muss das Cookie entsprechend konfiguriert werden. Nicht pauschal auf `true` umstellen und dadurch die lokale HTTP-Demo beschädigen.
- Datenbank-, Broker- und Managementports werden auf allen Host-Schnittstellen veröffentlicht. Falls nur lokale Nutzung vorgesehen ist, an Loopback binden oder unnötige Veröffentlichungen entfernen.

### 3.4 Logger-Healthcheck ist wirkungslos — offizielle Anforderung betroffen

**Beleg:** `docker-compose.yml`, Zeilen 66–70.

Der Healthcheck startet einen neuen Node-Prozess, der sofort erfolgreich endet. Er prüft weder die Brokerverbindung noch den aktiven Consumer des eigentlichen Logger-Prozesses. Ein defekter Logger kann deshalb weiterhin als gesund erscheinen.

Eine sinnvolle Prüfung muss die tatsächliche Bereitschaft des laufenden Services abbilden. Der API-Healthcheck prüft derzeit nur die Datenbank. Das Frontend kann trotz nicht erreichbarer API eine leere Seite mit HTTP 200 liefern; dessen HTTP-Healthcheck beweist somit keine funktionierende Gesamtkette.

### 3.5 Broker-Ausfälle werden nur teilweise behandelt

**Belege:** `backend-api/index.js`, Zeilen 34–50; `backend-logger/index.js`, Zeilen 6–31.

Anfängliche Verbindungsfehler lösen einen erneuten Versuch aus. Für eine später abbrechende Verbindung fehlen passende `error`-/`close`-Handler und ein sauberer Wiederverbindungsablauf. Solange die API keinen Channel hat, verwirft `publishEvent` Ereignisse stillschweigend. Publisher-Bestätigungen fehlen. Ein Logger-JSON-Parsingfehler wird innerhalb des Consumer-Callbacks ebenfalls nicht abgefangen.

Für den erlaubten Logging-POC ist kein komplexes Hochverfügbarkeitssystem gefordert. Die Dokumentation sollte aber keine verlustfreie Verarbeitung versprechen; Broker-Neustart und Ausfallverhalten sollten gezielt geprüft werden.

### 3.6 Docker-Builds sind nicht reproduzierbar genug

**Belege:** alle drei Dockerfiles, Frontend-Lockfile und ZIP-Inhalt.

- Backend und Logger besitzen kein Lockfile.
- Das Frontend-Dockerfile kopiert vor der Installation nur `package.json`; das vorhandene Lockfile wird erst nach `npm install` kopiert und steuert somit die Installation nicht.
- Alle Dockerfiles nutzen `npm install` statt einer auf einem mitgelieferten Lockfile basierenden Installation.
- `.dockerignore` fehlt. `COPY . .` kann dadurch lokale Abhängigkeiten und Buildreste ins Image übernehmen.
- Die ZIP enthält 3.701 Dateien unter `node_modules`, außerdem `build`, `.svelte-kit` und Git-Metadaten. Die nativen mitgelieferten Abhängigkeiten sind für macOS/ARM64.

Lockfiles für alle Services, eine passende `npm ci`-Installation und `.dockerignore` machen den Build nachvollziehbarer. Die Abgabe-ZIP sollte aus Quellcode, Konfiguration, Lockfiles und nötiger Dokumentation bestehen. Das Fehlen einer `.dockerignore` beweist für sich allein noch keinen fehlgeschlagenen Docker-Build.

### 3.7 Laufzeitversionen aktualisieren

Alle Dockerfiles verwenden `node:20-alpine`. Node 20 ist am Prüfdatum offiziell EOL; Node 22 und 24 werden als LTS geführt. Das verwendete RabbitMQ-3-Image liegt ebenfalls außerhalb des Community-Supports der letzten 3.x-Reihe.

Für einen gepflegten Stand eine unterstützte Node-LTS-Version und eine unterstützte RabbitMQ-Version auswählen und anschließend den vollständigen Start und die Kommunikation testen. Das ist eine Wartungs- und Sicherheitsverbesserung; die Kursvorgabe nennt keine konkrete Node- oder RabbitMQ-Hauptversion.

Offizielle Quellen, abgerufen am 20.10.2026:

- [Node.js Releases](https://nodejs.org/en/about/previous-releases)
- [RabbitMQ Support](https://www.rabbitmq.com/contact)

### 3.8 Startanleitung und Beispieldatei präzisieren

`README.md` enthält nur einen Platzhalter. Die zusätzliche Datei `Docker_Colima_Hilfe/DockerHilfe` erklärt den lokalen Ablauf, ist aber noch keine aufgeräumte, rechnerunabhängige Projektanleitung.

`env.example` liegt im Hauptordner; Compose liegt in `RumfrageTool`. Eine Beispiel-Datei wird nicht automatisch als `.env` geladen. Die mitgelieferten Compose-Standardwerte ermöglichen zwar eine Konfiguration ohne diese Datei, eigene Zugangsdaten müssen aber am tatsächlich verwendeten Compose-Standort korrekt eingebunden werden.

Eine kurze README sollte Voraussetzungen, den Startordner, erforderliche Konfiguration, Startbefehl, URLs, Datenhaltung, Testablauf und Arbeitsteilung erklären.

## 4. Abweichungen von eurem eigenen Funktionsplan

Die offizielle Grundaufgabe schreibt kein detailliertes Umfragemodell vor. Deshalb sind die folgenden Punkte **Abweichungen von eurem Plan**, nicht automatisch jeweils ein Verstoß gegen den Bewertungsbogen:

| Eigener Plan | Implementierter Stand |
|---|---|
| Eigene Umfragen verwalten | Eigentümer wird gespeichert, aber bei Änderungen/Löschungen nicht geprüft. |
| Fragen und Antwortoptionen | Genau eine Frage mit zwei fest vorgesehenen Optionen pro Umfrage. Keine eigenen Tabellen für Fragen/Optionen. |
| Eine Teilnahme pro Nutzer und Umfrage | Öffentliche Abstimmung ohne Teilnehmerdatensatz; wiederholtes Abstimmen ist unbegrenzt möglich. |
| Veröffentlichen und schließen | Kein Statusmodell und keine Schließen-Funktion. |
| Teilnahme per Link bzw. Code | Keine eigene Teilnahme-Route und kein Share-Code. |
| Ergebnisse als Anzahl und Prozent | Vorhanden. Bei null Stimmen zeigt die Oberfläche derzeit 50 % / 50 %; eine neutrale Anzeige wäre verständlicher. |
| Live-Ergebnisse später | Die Oberfläche behauptet bereits „in Echtzeit“, empfängt aber keine fremden Stimmen automatisch. Kein Polling, SSE oder WebSocket erkennbar. |

Die vereinfachte A/B-Umfrage kann grundsätzlich ein angemessenes Kursprojekt sein. Entscheidend sind euer tatsächlich angemeldeter Umfang und die zusätzliche Kundenanforderung. Eine geplante Mehrfachfragen-App ist mit dem aktuellen Datenmodell noch nicht umgesetzt.

## 5. Was fehlt, aber keine belegte allgemeine Pflicht ist

- **Swagger/OpenAPI:** nicht implementiert; weder in den ausgewerteten offiziellen Vorgaben noch in den eigenen Projektplänen als Pflicht gefunden. Eine frühere Aussage, Swagger sei bereits enthalten, wäre für diese ZIP falsch.
- **CI/CD:** keine Pipeline gefunden; keine entsprechende Projektpflicht gefunden. „Corporate Identity“ in Kapitel 1 bezeichnet das Erscheinungsbild und ist keine CI/CD-Pipeline.
- **Automatische Tests/Linting:** keine entsprechenden projektspezifischen Skripte oder Tests gefunden. Fehlerfreies Verhalten ist gefordert, ein bestimmtes Testframework nicht.
- **SSR:** vorhanden durch `+page.server.js`, Node-Adapter und serverseitige API-Aufrufe; behandelt im Kurs, aber im Bewertungsbogen nicht als eigene Pflicht benannt.
- **Svelte-Legacy-Helfer:** Der Import von `preventDefault` aus `svelte/legacy` macht das Projekt nicht zu Svelte 4. Er ist Teil der Svelte-5-Migrationshilfe. Die eigene Kompilierprüfung war erfolgreich. [Offizielle Migrationsdokumentation](https://svelte.dev/docs/svelte/v5-migration-guide)

Kapitel 1, Seite 7 nennt zusätzlich Marke/Geschichte, Corporate Identity, WCAG 2.1 und schlüssige Commits. Der neuere Bewertungsbogen wiederholt nicht alle Punkte. `PulsePoll` und ein einheitliches Erscheinungsbild sind vorhanden; eine begründete Markengeschichte oder vollständige WCAG-Konformität ist damit nicht nachgewiesen. Diese Folienpunkte nicht allein wegen einer älteren KI-Zusammenfassung als aufgehoben behandeln.

## 6. Tatsächlich durchgeführte Prüfungen und Grenzen

| Prüfung | Ergebnis |
|---|---|
| Projektquellen, Konfiguration, Lockfile und Kursvorgaben abgeglichen | Durchgeführt; Abhängigkeiten und generierte Dateien als solche eingeordnet. |
| Svelte-Komponenten für Client und Server kompiliert | Vier erfolgreiche Kompilierungen, keine Warnungen. Vorhandene Ignore-Kommentare für die bewusste Initialisierung aus SSR-Daten bleiben berücksichtigt. |
| JavaScript-Syntax von API, Logger und Server-Load | Erfolgreich mit `node --check`. |
| Isolierte Route-Handler mit simulierten externen Diensten | Fehlende Eigentümerprüfung und unbehandelte Typfehler reproduziert; nicht authentifizierter Löschzugriff korrekt mit 401 abgelehnt. |
| Vollständiger Frontend-Build | Versuch scheitert hier an fehlendem Linux-Rollup-Paket, weil die ZIP macOS-Abhängigkeiten enthält. Kein Beleg für einen fehlerhaften Build nach sauberer Neuinstallation. |
| Docker Compose / echte Datenbank / echter Broker | Nicht ausführbar: Docker und Datenbankserver fehlen in dieser Umgebung. |
| Firefox, Chrome, Mobilansicht, Lighthouse | Keine vollständigen Laufzeittests durchgeführt. |
| Dependency-Sicherheitsaudit | Kein vollständiger CVE-/`npm audit`-Nachweis; Supportstatus von Node/RabbitMQ anhand offizieller Quellen geprüft. |

Ein vollständiger Erfolgsnachweis braucht einen frischen Build und Start aus einer bereinigten ZIP, anschließend Registrierung/Login/Logout, CRUD, getrennte Nutzerrechte, fehlerhafte Eingaben, Datenpersistenz, Brokertransport und die Browser-/Barrierefreiheitstests.

## 7. Empfohlene Reihenfolge bis zur Abgabe

1. Backend-Besitzrechte und API-Validierung korrigieren.
2. JWT-Konfiguration und Login-Schutz verbessern.
3. Logger-Healthcheck und Broker-Fehlerbehandlung sinnvoll umsetzen.
4. Lockfiles, Dockerfiles, `.dockerignore` und README bereinigen; unterstützte Laufzeiten verwenden.
5. Tatsächliche Kundenanforderung und den angemeldeten fachlichen Umfang abgleichen; fehlende Pflichtfunktionen ergänzen.
6. Frischen Gesamtstart sowie CRUD mit zwei Nutzern, Neustarts, Chrome, Firefox, Mobilansicht und Lighthouse nachweisen.

## 8. Quellen im bereitgestellten Material

- `08_WebProgrammierung/10_Quellen/Moodle_Download/KA-WWI25B1- Web-Programmierung/.../07_Bewertung Webprog VS WWI25B1 - Google Docs.pdf`, Seiten 1–2: maßgebliche Bewertung und Projektanforderungen. Weitere enthaltene Kopien sind inhaltsgleich.
- `WebApp/Anforderungen/Aufgabenstellung als Text Extrahiert.md`, insbesondere Zeilen 38–69: Textfassung dieser Projektanforderungen.
- `01_kapitel-1.pdf`, Seite 7: zusätzliche Projektfolie.
- `01_Kapitel 2.pdf`, Seiten 177 und 188: Svelte und ausdrückliche Erwartung an Version 5.
- `01_Kapitel 3.pdf`, Seiten 53–58: SvelteKit, SSR und Express-Zusammenspiel als Lehrstoff.
- `WebApp/ProjektStruktur/Struktur.md` und `02_Umsetzung_Schritt_fuer_Schritt_WebApp.md`: eigene Architektur und Umsetzung, insbesondere die Rechteprüfung in Zeilen 385–406.
- `WebApp/ProjektIdeen/Umfragetool_Auswertung.md`, Zeilen 20–38: eigener Kernumfang und weiterhin offene Kundenanforderung.
- Anwendungscode und Konfiguration unter `WebApp/RumfrageTool/`.

Die Kursquellen nennen die Projektabgabe am 26.10.2026 um 23:55 Uhr. Der Bericht bewertet den bereitgestellten Dateistand; spätere Änderungen im GitHub-Repository sind nicht eingeschlossen.
