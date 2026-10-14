# Potenzielle zukünftige Änderungen

## 1. Datenpersistenz – SQLite statt In-Memory-Store

**Problem:** Alle Sessions, Fragen und Antworten gehen beim Neustart des Servers verloren, da der aktuelle Store nur im RAM (JavaScript `Map`) gehalten wird.

**Lösung:** Austausch des In-Memory-Stores gegen SQLite.

- Einzelne `.db`-Datei, kein separater Datenbankserver nötig
- Node.js-Paket: `better-sqlite3`
- Die Architektur ist bereits dafür vorbereitet: Backend und Datenhaltung sind klar getrennt, das Frontend muss nicht angepasst werden
- Nur `backend/store/inMemory.js` müsste durch `backend/store/sqlite.js` ersetzt werden und die gleichen Funktionen exportieren

**Aufwand:** mittel (ca. 2–4 Stunden)

---

## 2. Ergebnisse im Präsentations-Modus anzeigen

**Problem:** `display.html` zeigt zwar live eingehende Antworten während eine Frage aktiv ist, aber wenn der Moderator explizit „Ergebnisse zeigen" drückt (nach Stoppen der Frage), werden die finalen Ergebnisse im Präsentations-Modus nicht dauerhaft dargestellt.

**Lösung:**

- Den `SHOW_RESULTS`-WebSocket-Event in `display.html` vollständig auswerten und das Ergebnis-Diagramm als Vollbild-Ansicht einblenden
- Zustand halten, sodass das Diagramm sichtbar bleibt bis die nächste Frage gestartet wird
- Optional: animierter Übergang vom „Warte"-Bildschirm zum Ergebnis-Diagramm

**Aufwand:** gering (ca. 1–2 Stunden)

---

## 3. Externe Erreichbarkeit – Deployment oder Tunnel

**Problem:** Der Server läuft aktuell nur lokal (`localhost:3000`). Andere Geräte können nur zugreifen, wenn sie im gleichen WLAN sind und die lokale IP manuell konfiguriert wird. Über das Internet ist die App nicht erreichbar.

**Lösungsoptionen:**

- **Kurzfristig (Demo/Test):** Tunnel-Dienst wie [ngrok](https://ngrok.com) oder [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) – erzeugt eine öffentliche URL, die auf den lokalen Server weiterleitet, ohne Servermiete
- **Mittelfristig:** Deployment auf einem Cloud-Anbieter (z. B. Railway, Render, Fly.io) – kostenlose Tiers verfügbar, Server läuft dauerhaft
- **Langfristig:** Eigener VPS (z. B. Hetzner) mit nginx als Reverse Proxy und HTTPS via Let's Encrypt

In allen Fällen muss `ALLOWED_ORIGINS` in `.env` auf die jeweilige öffentliche Domain angepasst werden.

**Aufwand:** gering bis mittel je nach Option (ngrok: ~10 Minuten; Cloud-Deployment: ~2–4 Stunden)

---

## 4. Finale Session-Übersicht und Export

**Problem:** Nach dem Ende einer Session gibt es keine Zusammenfassung aller Fragen und Ergebnisse. Ergebnisse können nicht gespeichert oder weitergegeben werden.

**Lösung:**

- Neue Seite `auswertung.html?id=SESSION_ID` mit Übersicht aller Fragen inkl. Ergebnisdiagrammen
- Erreichbar über einen „Auswertung"-Button im Moderator-Dashboard nach Session-Ende
- Export-Optionen:
  - **JSON:** vollständige Rohdaten (Fragen, Antworten, Timestamps) per `GET /api/sessions/:id/export`
  - **PDF:** Druckansicht der Auswertungsseite via `window.print()` mit druckoptimiertem CSS (kein Server-seitiges PDF nötig)
- Setzt Änderung 1 (Datenpersistenz) voraus, damit Ergebnisse nach Server-Neustart noch verfügbar sind

**Aufwand:** mittel (ca. 3–5 Stunden)

