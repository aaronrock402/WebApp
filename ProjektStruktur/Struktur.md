Ja. Ich habe die drei ZIPs gegeneinander geprüft: **aktuelle Aufgabenstellung**, **euren WebApp-Stand** und **Chapter 1–3 / Moodle-Quellen**. Die wichtigste Korrektur direkt vorweg:

> **Svelte + SQLite wäre für eure Abgabe falsch.**  
> SQLite wird in der aktuellen Aufgabenstellung ausdrücklich ausgeschlossen. Die Datenbank soll in einem **eigenen Container** laufen.

## Meine feste Empfehlung für euer Umfragetool

```
Browser
   │
   ▼
SvelteKit / Svelte 5
+ Tailwind
   │
   │ REST / JSON
   ▼
Node.js + Express
API-Service
(Auth + Umfragen + Abstimmungen)
   │
   ├──────────────► PostgreSQL
   │                eigener Container
   │
   ▼
RabbitMQ
   │
   ▼
Node.js Logging-Service
zweiter eigener Backend-Service

ALLES zusammen:
docker compose up
```

|Bereich|Das würde ich festlegen|Warum|
|---|---|---|
|Frontend|**SvelteKit mit Svelte 5**|Svelte ist klar Vorlesungsstoff; SvelteKit verbindet Routing, SSR und Express-Backend|
|Styling|**Tailwind CSS**|In euren Vorlesungsnotizen ausdrücklich fürs Projekt empfohlen; gut für Mobile-first|
|Hauptbackend|**Node.js + Express.js**|Genau der Backend-Stack aus Kapitel 3|
|API|**REST + JSON + CRUD**|Genau so wird Express im Foliensatz aufgebaut|
|Datenbank|**PostgreSQL**|relational passend für Nutzer → Umfragen → Fragen → Antworten; als separater Docker-Container|
|Message Broker|**RabbitMQ**|erfüllt die Vorgabe und ist für euren kleinen POC deutlich sinnvoller als Kafka|
|2. Backend-Service|**Logging/Audit-Service in Node.js**|Logging ist laut Aufgabenstellung ausdrücklich als POC erlaubt|
|Auth|**Backend-Auth + Passwort-Hash + sichere HttpOnly-Cookies**|Login muss sicher sein; Rechte unbedingt serverseitig prüfen|
|Betrieb|**Docker Compose**|kompletter Stack muss mit `docker compose up` starten|
|Konfiguration|**`.env.example` / Compose-Variablen**|explizite Pflicht|
|Monitoring|**Healthchecks**|explizite Pflicht|

### Warum SvelteKit und nicht Astro?

**Astro würde ich für euer Projekt nicht nehmen.** Kapitel 2 sagt selbst: Astro/SSG ist für Blogs, Dokus und Landingpages gedacht. Bei **nutzerspezifischen Inhalten** lautet die Entscheidungshilfe dagegen „SPA oder SSR“. Genau das ist ein Umfragetool mit Login, eigenen Umfragen und Ergebnissen.

Beleg:  
`Kapitel 2- JS/FS_01/11_Astro_SSG_und_Islands.md`, Z. 31–57, Original **Kapitel 2 PDF ab S. 210**.

Svelte wird dagegen in der Vorlesung ganz konkret ausgewählt: „wenig Code, wenig Ballast – ideal zum Konzepte-Lernen“. Original **Kapitel 2 PDF S. 177**. Eure eigene Notiz vom 14.10. sagt zusätzlich: „Svelte ist gewollt in Webprogrammierung Projekt oder so“.

Ich würde **SvelteKit statt einer nackten Svelte-SPA** nehmen, weil ihr es inzwischen ebenfalls behandelt habt und die Folien genau diesen Aufbau zeigen:

```
SvelteKit → Express-API → Daten
```

Kapitel 3 beschreibt SvelteKit ausdrücklich als „Svelte + Routing + SSR + Backend-Zugriff“. Die eigentliche Geschäftslogik würde ich trotzdem bewusst in eurem Express-Service lassen.  
Beleg: `07_SvelteKit_und_Server_Side_Rendering.md`, Z. 33–94; Original **Kapitel 3 PDF S. 53–57**.

---

## Datenbank: wichtig

**Kein `localStorage` für Umfragen, Nutzer oder Votes. Keine SQLite.**

Die Aufgabenstellung sagt wortwörtlich sinngemäß:

- DB in einem **separaten Container**
- **keine embedded Database wie SQLite oder lowdb**

`ProjektOrdner/Aufgabenstellung als Text Extrahiert.md`, **Z. 63–69**; identisch mit der aktuellen Bewertungs-PDF, **S. 2**.

`localStorage` war nur eine Lernstufe beim Bookmark-Manager. Kapitel 3 endet sogar mit dem Hinweis, dass `localStorage` der „erste Kandidat“ ist, der vom Client auf den Server gehört.  
`07_SvelteKit_und_Server_Side_Rendering.md`, Z. 581–629; Original **Kapitel 3 PDF S. 65**.

**Die PostgreSQL-Datenbank muss auch nicht öffentlich im Internet laufen.** Ein PostgreSQL-Container innerhalb eures lokalen `docker compose` erfüllt die aktuelle Vorgabe. Eine öffentliche Cloud-Datenbank oder öffentliches Deployment wird nirgends verlangt.

---

## Was euer Umfragetool mindestens können sollte

Ich würde den Funktionsumfang bewusst klein halten: Registrierung/Login, eigene Umfragen erstellen/bearbeiten/löschen, Fragen und Antwortmöglichkeiten verwalten, Umfrage veröffentlichen/schließen, als anderer Nutzer abstimmen und Ergebnisse als Anzahl/Prozent anzeigen. Das reicht, um **Mehrbenutzerbetrieb + CRUD + Auth + Backend + Datenbank** sauber zu demonstrieren.

Der Request-Fluss wäre zum Beispiel:

```
Nutzer klickt "Umfrage erstellen"
        ↓
SvelteKit
        ↓ POST /api/surveys
Express REST API
        ↓
PostgreSQL
        ↓
survey.created
        ↓
RabbitMQ
        ↓
Logging-Service
```

Das ist besonders gut fürs Interview, weil ihr daran fast den kompletten Vorlesungsstoff erklären könnt: **Client/Server, REST, CRUD, Node.js, Express, Middleware, Auth, Datenbank, Broker, Docker und SSR/SPA**.

Express + REST + CRUD sind dabei praktisch 1:1 aus Kapitel 3:  
`05_REST_APIs_mit_Express_js.md`, Z. 27–99; Original **Kapitel 3 PDF S. 31–34**. Node.js wird dort explizit für REST APIs und Microservices eingeordnet (`04_Node_js_als_Backend_Laufzeit.md`, Z. 31–54).

---

## Was ihr für die Abgabe auf keinen Fall vergessen dürft

Die **aktuelle Aufgabenstellung** ist hier entscheidend, nicht irgendwelche älteren allgemeineren Folien. Eure App muss mobile UX in Firefox und Chrome haben, Lighthouse-Barrierefreiheit erfüllen, sicher authentifizieren, fehlerfrei funktionieren, mit **einem `docker compose up`** starten, mehrere eigene Node-Backend-Services besitzen, über RabbitMQ/Kafka kommunizieren, eine separate Datenbank besitzen, Umgebungsvariablen dokumentieren und sinnvolle Healthchecks haben. Außerdem kommt noch die unbekannte **Kundenanforderung** dazu.

Quelle dafür ist direkt `20_Lernmaterial/ProjektOrdner/Aufgabenstellung als Text Extrahiert.md`, **Z. 38–69**. Die aktuelle Moodle-Datei `Bewertung Webprog VS WWI25B1 - Google Docs.pdf`, **S. 2**, bestätigt dieselben Anforderungen.

Die ältere Kapitel-1-Lernseite enthält zusätzlich Dinge wie Marke/Story/Corporate Identity. **Die habe ich bewusst nicht zu eurer aktuellen Pflichtliste hinzugefügt**, weil du gesagt hast, dass die jetzige Aufgabenstellung im Projektordner maßgeblich ist und die aktuelle Bewertungsdatei diese Zusatzpunkte ebenfalls nicht als aktuelle Projektanforderungen nennt.

### Für eine 1,0 ist noch etwas wichtiger als der Stack

Die Anwendung allein garantiert keine 1,0. Das **Projekt zählt nur 10 %**, während das **Interview 50 %** zählt. Im Interview präsentiert jeder die Anwendung, bekommt Projekt- und Vorlesungsfragen und muss auch Teile verstehen, die andere Gruppenmitglieder gebaut haben. Quelle: Aufgabenstellung Z. 5–31 bzw. Bewertungs-PDF S. 1.

Deshalb wäre mein Ziel nicht „möglichst viele Technologien“, sondern:

**SvelteKit + Tailwind → Express REST API → PostgreSQL → RabbitMQ → Logging-Service → Docker Compose.**

Das ist klein genug, dass ihr es komplett verstehen könnt, aber deckt praktisch **jede technische Pflichtanforderung** sauber ab. Kafka, Astro, WebSockets, SQLite, eine riesige Microservice-Landschaft oder zehn verschiedene Frameworks würde ich weglassen.