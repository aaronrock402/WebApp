# Webprogrammierung – Wissens- und Projektkontext

## Ziel
Bei Entwicklung, Architektur und Erklärungen soll sich möglichst an den Inhalten der DHBW-Vorlesung **Webprogrammierung** orientiert werden. Lösungen sollen nicht unnötig kompliziert sein, sondern verständlich, lernfreundlich und mit Bezug zur Vorlesung umgesetzt werden.

---

## Kapitel 1 – Web-Grundlagen, HTML & CSS

Grundwissen:

- Aufbau und Funktionsweise des Webs
- Client und Server
- HTTP-Grundprinzip
- Webseitenstruktur
- HTML
  - Elemente
  - Attribute
  - semantisches HTML
  - Formulare
  - Links
  - Bilder
  - Tabellen
- CSS
  - Selektoren
  - Klassen und IDs
  - Box Model
  - Größen, Abstände und Positionierung
  - Responsive Design
  - grundlegendes Seitenlayout

Wichtig:
HTML beschreibt hauptsächlich die **Struktur**, CSS das **Aussehen**.

---

## Kapitel 2 – JavaScript & Frontend

### JavaScript

Grundlagen:

- Variablen
- Datentypen
- Operatoren
- Bedingungen
- Schleifen
- Funktionen
- Arrays
- Objekte

### DOM

JavaScript kann über das **Document Object Model (DOM)** HTML-Elemente lesen und verändern.

Typische Themen:

- Elemente auswählen
- Inhalte ändern
- CSS-Klassen ändern
- Elemente erzeugen
- Formulare auslesen

### Events

Reaktionen auf Benutzeraktionen:

- Klick
- Eingabe
- Submit
- Tastatureingaben
- andere Browserereignisse

---

## Layout & CSS-Frameworks

Behandelt werden unter anderem:

- Flexbox
- responsive Layouts
- Tailwind CSS

Tailwind arbeitet hauptsächlich mit kleinen Utility-Klassen direkt im HTML bzw. in Komponenten.

---

## jQuery

jQuery vereinfacht klassische DOM-Manipulation und Event-Verarbeitung.

Für moderne Projekte ist es weniger wichtig, gehört aber zum Vorlesungsstoff.

---

# Svelte 5

Svelte ist das zentrale moderne Frontend-Framework der Vorlesung.

Wichtige Konzepte:

- Komponenten
- Props
- State
- Events
- reaktive Oberfläche
- Bedingungen
- Schleifen
- Formulare

Wichtige Svelte-5-Syntax:

- `$state`
- `$derived`
- `{#if}`
- `{#each}`
- `bind:value`

Svelte aktualisiert die Oberfläche automatisch, wenn sich relevante Daten ändern.

---

# SvelteKit

SvelteKit erweitert Svelte zu einem vollständigen Web-Framework.

Wichtige Themen:

- dateibasiertes Routing
- Seiten
- Layouts
- Server-Code
- Daten laden
- Form Actions
- SSR
- Hydration

Typische Dateien:

- `+page.svelte`
- `+page.ts`
- `+page.server.ts`
- `+layout.svelte`
- `+server.ts`

### SSR

Server-Side Rendering:

Der Server erzeugt zunächst HTML und sendet es an den Browser.

### Hydration

Danach übernimmt JavaScript im Browser die bereits gerenderte Seite und macht sie interaktiv.

---

# Kapitel 3 – Backend

## Verteilte Systeme

Eine Anwendung kann aus mehreren getrennten Komponenten oder Services bestehen.

Begriffe:

- Client
- Server
- Service
- Monolith
- Microservices
- Peer-to-Peer
- Netzwerkkommunikation

---

## CAP-Theorem

Bei verteilten Systemen spielen folgende Eigenschaften eine Rolle:

- **Consistency**
- **Availability**
- **Partition Tolerance**

Bei einem Netzwerkausfall kann ein verteiltes System nicht gleichzeitig vollständige Konsistenz und vollständige Verfügbarkeit garantieren.

---

# Node.js

Node.js ermöglicht JavaScript-Ausführung außerhalb des Browsers.

Typischer Einsatz:

- Webserver
- APIs
- Backend-Services

---

# Express

Express ist ein leichtgewichtiges Framework für Node.js-Backends.

Wichtige Konzepte:

- Server
- Routes
- Request
- Response
- Middleware
- Router

Beispielhafte API-Routen:

- GET `/todos`
- GET `/todos/:id`
- POST `/todos`
- PUT/PATCH `/todos/:id`
- DELETE `/todos/:id`

---

# REST

REST beschreibt einen üblichen Aufbau von Web-APIs.

Typische HTTP-Methoden:

- GET → Daten lesen
- POST → Daten erstellen
- PUT → vollständig ändern
- PATCH → teilweise ändern
- DELETE → löschen

CRUD:

- Create
- Read
- Update
- Delete

---

# Middleware

Middleware sitzt zwischen HTTP-Anfrage und eigentlicher Route.

Mögliche Aufgaben:

- Logging
- Authentifizierung
- JSON-Verarbeitung
- Fehlerbehandlung
- Validierung

---

# Kapitel 4 – Docker

Docker verpackt Anwendungen zusammen mit ihrer benötigten Laufzeitumgebung.

Wichtige Begriffe:

- Image
- Container
- Dockerfile
- Registry
- Volume
- Network
- Port
- Docker Compose
- Healthcheck

---

## Dockerfile

Beschreibt, wie ein Docker-Image gebaut wird.

Typische Schritte:

- Basis-Image festlegen
- Dateien kopieren
- Abhängigkeiten installieren
- Port dokumentieren
- Startbefehl festlegen

---

## Docker Compose

Docker Compose startet mehrere zusammengehörige Services gemeinsam.

Beispielsweise:

- Frontend
- Backend
- Datenbank
- RabbitMQ

Ziel des Projekts:

Die Anwendung soll möglichst mit

`docker compose up`

startbar sein.

---

## Volumes

Volumes speichern Daten unabhängig vom Lebenszyklus eines Containers.

Besonders wichtig für Datenbanken.

---

## Healthchecks

Healthchecks prüfen automatisch, ob ein Service tatsächlich funktionsfähig ist.

Nicht nur:
„Container läuft“

sondern beispielsweise:
„Backend antwortet wirklich.“

---

# Kapitel 5 – Full Stack

## Umgebungsvariablen

Konfigurationen sollen nicht direkt im Quellcode stehen.

Beispiele:

- Datenbankadresse
- Benutzername
- Passwort
- Ports
- API-Konfiguration

Typisch über:

- ENV
- `.env`

Secrets dürfen nicht öffentlich ins Git-Repository gelangen.

---

# PostgreSQL

PostgreSQL ist die relationale Datenbank des Projekts.

Typische Konzepte:

- Tabellen
- Zeilen
- Spalten
- Primärschlüssel
- Fremdschlüssel
- Beziehungen
- SQL

---

# Prisma

Prisma verbindet Node.js/TypeScript mit der Datenbank.

Typische Aufgaben:

- Datenmodell definieren
- Migrationen
- Daten lesen
- Daten erstellen
- Daten ändern
- Daten löschen

Prisma ist damit die Verbindung zwischen Backend und PostgreSQL.

---

# SvelteKit-Datenfluss

Typischer Ablauf:

Browser  
→ SvelteKit  
→ Backend/Server-Code  
→ Prisma  
→ PostgreSQL  
→ Antwort zurück an die Oberfläche

Daten können beispielsweise über `load` geladen werden.

Formulare können über **Form Actions** serverseitig verarbeitet werden.

---

# RabbitMQ

RabbitMQ ist ein Message Broker.

Services müssen dadurch nicht immer direkt miteinander kommunizieren.

Beispiel:

Service A  
→ Nachricht  
→ RabbitMQ  
→ Service B

Begriffe:

- Producer
- Queue
- Consumer
- Message

Geeignet für:

- asynchrone Verarbeitung
- lose Kopplung von Services
- Events zwischen Backend-Services

---

# Architektur-Richtung für das Projekt

Bevorzugter Stack:

Frontend:
- Svelte 5
- SvelteKit 2
- TypeScript
- Tailwind CSS

Backend:
- Node.js
- eigene Backend-Services

API:
- HTTP / REST

Datenbank:
- PostgreSQL

Datenbankzugriff:
- Prisma

Containerisierung:
- Docker
- Docker Compose

Service-Kommunikation:
- RabbitMQ oder Kafka

Konfiguration:
- Environment Variables

---

# Projektanforderungen

Bei der Entwicklung besonders beachten:

- mobile Nutzbarkeit
- Firefox und Chrome
- sinnvolle responsive Darstellung
- Lighthouse / Accessibility
- sichere Authentifizierung
- Kernfunktionen müssen zuverlässig funktionieren
- mehrere eigene Node.js-Backend-Services
- Kommunikation zwischen Services über RabbitMQ oder Kafka
- separate Datenbank
- Datenbank nicht nur eingebettet/in-memory
- Umgebungsvariablen verwenden
- sinnvolle Healthchecks
- gesamtes Projekt möglichst über Docker Compose startbar

---

# Entwicklungsprinzipien

Bei jeder neuen Funktion sollte geprüft werden:

1. Was ist die fachliche Aufgabe?
2. Gehört sie ins Frontend oder Backend?
3. Werden Daten gespeichert?
4. Welche API wird benötigt?
5. Welcher Service ist verantwortlich?
6. Braucht die Funktion synchrone REST-Kommunikation oder eine Nachricht über RabbitMQ?
7. Wie wird die Funktion in Docker betrieben?
8. Wie wird ein Fehler behandelt?
9. Wie kann die Funktion getestet werden?
10. Passt die Lösung zum Vorlesungsstoff?

---

# Wichtig für KI-Unterstützung

Bei Vorschlägen und Code:

- möglichst Svelte 5 verwenden
- SvelteKit 2 berücksichtigen
- keine unnötig komplizierte Architektur
- verständlichen Code schreiben
- Lernbarkeit vor maximaler Abstraktion
- erklären, warum etwas gemacht wird
- bestehende Projektstruktur respektieren
- keine Technologien hinzufügen, wenn sie keinen sinnvollen Nutzen haben
- Sicherheitsaspekte berücksichtigen
- bei Architekturentscheidungen möglichst Bezug zur Vorlesung herstellen

Wenn mehrere Lösungen möglich sind, soll bevorzugt die Lösung gewählt werden, die **einfach, sauber, vorlesungsnah und für Studierende nachvollziehbar** ist.