# Portfolio

## Zusammensetzung

|  |  |  |
|---|---|---|
| Aufgabenvorstellung (Präsentation) | 20% | Verteilt |
| Kurztest | 20% (Maximum) | 30 min |
| Interview (Prüfungsgespräch) | 50% | 15 min / Student |
| Projekt | 10% | Abgabe 26.10.<br>23:55 |

## Aufgabenvorstellung:

Übung in den Vorlesungen. Vorstellen danach entweder freiwillig oder per Zufall ausgewählt.  
Infos zu Fehlzeiten: siehe Foliensatz 1

## Kurztest:

In 4. Semester; Fragen zu gesamter Vorlesung, mehr Infos folgen

## Interview:

Zeitslot siehe Einteilung. Unbedingt 10min früher da sein und danach genug Zeit einplanen

Im Interview wird die gebaute Anwendung individuell präsentiert und Rückfragen beantwortet. Ebenso können sich die Fragen auf die Vorlesungsinhalte beziehen.  
Pro Studierenden sind 15 Minuten geplant.

Arbeitsteilung: nicht jeder muss alles gemacht haben, aber transparent und es kommen Fragen zu den anderen Teilen

Vorstellung des Projekts, Beantwortung von Fragen zu Projekt und Vertiefung zu Vorlesungsthemen.  
Git-Repo-Zugriff benötigt  
Letzte 2 Termine dafür

---

# Projekt

## Anforderungen:

- [ ] Gute UX auf mobile und in Firefox & Chrome
- [ ] Barrierefrei nach Google Lighthouse-Metriken
- [ ] Startet einwandfrei mit einem Befehl (docker compose up)
- [ ] Authentifizierung sicher umgesetzt
- [ ] Anforderungen funktionieren ohne Bugs

Grundanforderungen: Eine Web-App, aufgeteilt in Frontend (JS-Framework) und Backends (Node.js), in der mehrere Nutzer “Entitäten” anlegen, bearbeiten und löschen können.

## Beispiele:

- Link shortener
- Bookmark Manager
- Umfragetool
- Quiz App
- Anki Clone
- URL Uptime Monitor
- PDF splitter / merger
- ...

Es darf ein abweichendes Thema gewählt werden. Der Umfang sollte mindestens dem der Beispiele entsprechen. Der Einsatz von WebSockets wird nicht erwartet.

Es kommt nach Themenanmeldung eine “Kundenanforderung” dazu, eine Anforderung, die ebenfalls erfüllt werden muss.

Die Anwendung enthält mehrere eigene Backend-Services; die Services kommunizieren über RabbitMQ oder Kafka miteinander. (POC, Logging auch ok)

Für fertige Komponenten (Datenbank etc.) können auf Dockerhub oder anderen öffentlichen Registries gehostete Images verwendet werden. Eigene Container werden mit Dockerfiles gebildet. Die Datenbank sollte in separaten Containern laufen (keine embedded Database wie SQLite oder lowdb).

Es werden Umgebungsvariablen verwendet. Diese sind Teil der docker-compose.yml, oder in einer .env.example-Datei dokumentiert.

Es sind sinnvolle Healthchecks implementiert.

## KI-Nutzung

KI-Nutzung ist im Projekt und der Bearbeitung der Aufgaben in den Vorlesungen uneingeschränkt zugelassen. Nicht aber im Interview, Kurztest und der Aufgabenvorstellung.
