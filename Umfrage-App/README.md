# VoteLive – Echtzeit-Umfrage-Webapp

Eine Slido/Menti-ähnliche Webapp für Live-Abstimmungen. Moderatoren erstellen Sessions mit Fragen, Teilnehmer stimmen per Browser ab – ohne Account oder App.

## Starten

```bash
cd backend
npm install        # einmalig
node server.js     # oder: npm start
```

Dann im Browser öffnen: **http://localhost:3000**

## Seiten

| URL | Beschreibung |
|---|---|
| `http://localhost:3000` | Teilnehmer: Session per Code beitreten |
| `http://localhost:3000/moderator.html` | Moderator: Login, Sessions und Fragen verwalten |

## Fragetypen

- **Multiple Choice** – Abstimmung mit 2–6 Optionen, Balkendiagramm
- **Skala / Rating** – Schieberegler, Durchschnitt + Verteilung
- **Wortwolke** – Freitext-Stichwort, häufige Begriffe erscheinen größer
- **Offene Frage** – Freitextantworten als Live-Liste

## Technologie

- **Frontend**: Vanilla HTML + CSS + JavaScript (kein Framework)
- **Backend**: Node.js + Express 5 + WebSockets (`ws`)
- **Auth**: JWT + bcrypt
- **Datenhaltung**: In-Memory (kein Datenbank-Setup nötig)
