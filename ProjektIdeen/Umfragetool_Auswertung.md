# Umfragetool – Eignung für das Webprojekt

**Gesamturteil: sehr gut geeignet.** Das Umfragetool wird ausdrücklich als Beispiel genannt. Mehrbenutzerbetrieb, Datenverwaltung und Auswertung passen natürlich zusammen. **Einschätzung zum Aufwand:** fachlich überschaubar, technisch mittel – vor allem wegen Authentifizierung, Services und Docker.

**Bewertungsbasis:** die beigefügte Aufgabenstellung. Bewertet wird die Idee, keine fertige Anwendung; die konkrete Ausgestaltung ist ein Vorschlag.

## 1. Die Idee in einem Beispiel

PERSON A erstellt und bearbeitet „Was machen wir am Teamtag?“ mit „Bowling“ und „Escape Room“. Nach Veröffentlichung stimmen andere registrierte Nutzer über einen Link ab. Ergebnis: **3 von 5 Stimmen für Bowling = 60 %**. PERSON A kann die Umfrage schließen oder löschen.

## 2. Wie gut passen die Anforderungen?

**Sehr gut:** natürliche fachliche Passung. **Gut:** gut umsetzbar, aber zusätzlicher technischer Aufwand. Die tatsächliche Erfüllung muss die fertige Anwendung zeigen.

| Anforderung | Passung | Umsetzung / Mini-Beispiel |
|---|---|---|
| Mehrere Nutzer; Entitäten anlegen, bearbeiten, löschen | Sehr gut | Umfragen, Fragen und Antwortoptionen verwalten. PERSON B und PERSON A besitzen jeweils eigene Umfragen. |
| Frontend mit JS-Framework; Backends mit Node.js | Sehr gut | Frontend zeigt Formulare und Ergebnisse; Node.js verarbeitet und speichert die Daten. |
| Mehrere eigene Backend-Services; RabbitMQ oder Kafka | Gut | Umfrage-Service sendet über RabbitMQ ein Ereignis an einen eigenen Node.js-Logging-Service. Logging ist ausdrücklich als POC erlaubt. |
| Sichere Authentifizierung | Gut | Passwörter sicher hashen, Sitzung absichern und Rechte im Backend prüfen: PERSON B darf die Umfrage von PERSON A auch mit bekannter ID nicht ändern. |
| Gute mobile UX; Firefox und Chrome | Sehr gut | Kurze Formulare, gut bedienbare Auswahlfelder und lesbare Ergebnisse. Den ganzen Ablauf mobil und in beiden Browsern prüfen. |
| Barrierefreiheit nach Lighthouse-Metriken | Sehr gut | Beschriftete Formularfelder, Tastaturbedienung, ausreichende Kontraste; Ergebnisse zusätzlich als Text. Lighthouse tatsächlich prüfen. |
| Start mit `docker compose up` | Gut | Frontend, eigene Services, Broker und Datenbank gemeinsam starten. Erster Start einschließlich Datenbankinitialisierung muss funktionieren. |
| Eigene Dockerfiles; separate Datenbank-Container | Gut | Eigene Anwendungsteile selbst bauen; fertige Images für Broker und Datenbank verwenden. Keine eingebettete SQLite-/lowdb-Datenbank. |
| Umgebungsvariablen | Gut | Beispielsweise Datenbankzugang und Broker-Adresse in Compose festlegen oder in `.env.example` dokumentieren. |
| Sinnvolle Healthchecks | Gut | API-Bereitschaft, Datenbank und Broker prüfen; beim Logging-Service auch die Verbindung zum Broker berücksichtigen. |
| Anforderungen funktionieren ohne Bugs | Gut prüfbar | Speichern, Abstimmen und Auswerten haben klare erwartete Ergebnisse. Auch ungültige Eingaben, fremde Zugriffe und Neustarts prüfen. |
| Zusätzliche „Kundenanforderung“ nach Anmeldung | Noch offen | Erweiterungen wie ein Enddatum wären naheliegend. Der tatsächliche Aufwand ist erst nach Bekanntgabe bewertbar. |

## 3. Sinnvoller kleiner Projektumfang

**Vorgeschlagener Kern:** Registrierung/Login; eigene Umfragen mit Fragen und Antwortoptionen verwalten; zunächst nur Einfachauswahl; veröffentlichen, per Link teilen und schließen; eine Teilnahme pro Nutzer und Umfrage; Ergebnisse als Anzahl und Prozentwerte anzeigen.

**Bewusst später:** anonyme Teilnahme, komplexe Fragetypen, Verzweigungen, Drag-and-drop-Editor, E-Mail-Einladungen und Live-Ergebnisse. WebSockets werden laut Aufgabenstellung nicht erwartet.

**Kleine Service-Aufteilung:** Ein Umfrage-Service für Nutzerverwaltung, Umfragen, Antworten und Auswertung; ein eigener Node.js-Logging-Service als zweites Backend. Broker und Datenbank allein zählen nicht als eigene Backend-Services.

*Mini-Beispiel:* Eine gespeicherte Antwort löst `vote.submitted` mit Umfrage-ID und Zeitpunkt aus. RabbitMQ überträgt das Ereignis an den Logging-Service. Dessen Protokoll zeigt den Empfang.

## 4. Die wichtigsten Stolperstellen

| Stolperstelle | Sinnvolle Begrenzung / Mini-Beispiel |
|---|---|
| Änderungen verfälschen vorhandene Antworten | Fragen und Optionen nur im Entwurf ändern. „Bowling“ darf nach zehn Stimmen nicht zu „Wandern“ werden. |
| Doppelte Teilnahme | Im Backend und in der Datenbank absichern. Ein deaktivierter Button verhindert keine zweite Anfrage. |
| Unklare Rechte | Besitzer verwaltet die Umfrage und sieht die Auswertung; andere Nutzer dürfen an veröffentlichten Umfragen teilnehmen. |
| Unplausible Ergebnisse | Keine Teilnahme nach Schließung; bei null Antworten „Noch keine Antworten“ anzeigen, nicht durch null teilen. |
| Technischer Aufwand wird unterschätzt | Container-Start und ein Beispielereignis zwischen den Services früh zum Laufen bringen; danach Funktionen ausbauen. |

## 5. Bedeutung für die Bewertung

- **Projekt: 10 %; Interview: 50 %.** Gut erklärbarer Ablauf: Klick → Backend → Datenbank sowie Ereignis → Broker → Logging-Service.
- **15 Minuten Interview pro Person:** Arbeitsteilung offenlegen, Git-Repo-Zugriff bereitstellen und auch fremde Projektteile sowie Vorlesungsinhalte erklären können.
- **Mini-Fragen:** „Warum Besitzrechte im Backend prüfen?“ – „Was passiert bei zwei gleichzeitigen Abstimmungen desselben Nutzers?“
- **Aufgabenvorstellung und Kurztest:** Vorlesungswissen zusätzlich lernen. KI ist im Projekt erlaubt, in diesen beiden Prüfungsbestandteilen und im Interview nicht.
- **Abgabe laut Aufgabenstellung:** 26.10., 23:55 Uhr. Zeit für die spätere Kundenanforderung und gemeinsame Prüfung einplanen.

---

Quelle: `Aufgabenstellung als Text Extrahiert(2).md`. Umsetzungsvorschläge und Einschätzungen sind keine zusätzlichen Vorgaben der Aufgabenstellung.
