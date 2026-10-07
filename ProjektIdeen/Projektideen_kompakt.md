# Projektideen – sehr kompakt

## Rahmen aus der Aufgabenstellung

Die App sollte mehrere Nutzer unterstützen, eigene Entitäten anlegen/bearbeiten/löschen können, sicher authentifizieren, per `docker compose up` starten und aus mehreren Backend-Services bestehen, die z. B. über RabbitMQ oder Kafka kommunizieren.

## Ideen

| Idee | Kurzbeschreibung | Warum geeignet |
|---|---|---|
| **Tournament Hub** | Turniere, Teams, Matches, Tabellen und Ergebnisse verwalten | Sehr gutes CRUD, Rankings/Tabellen wirken direkt, mehrere Rollen möglich |
| **Trip Planner** | Reisen, Orte, Aktivitäten, Abstimmungen und Packlisten planen | Viele natürliche Entitäten, mobil sinnvoll, gute UX-Möglichkeiten |
| **Challenge App** | Freunde erstellen Challenges, sammeln Punkte und Streaks | Spielerisch, motivierend, Rankings und Events passen gut |
| **MovieNight** | Filme sammeln, vorschlagen, voten und gemeinsam auswählen | Einfacher Kern, aber viel Raum für gute UI und Statistiken |
| **Collection Tracker** | Eigene Sammlungen für Filme, Games, LEGO, Karten usw. | Universell, visuell stark, Suche/Filter/Statistiken passen perfekt |
| **GearShare** | Geräte oder Gegenstände verleihen, reservieren und zurückgeben | Sehr klare Businesslogik, Auth/Rollen/Status gut demonstrierbar |
| **Campus Hub** | Lerngruppen, Events, Räume, Mitfahrten oder Leihgegenstände | Realer Nutzen, mehrere Nutzergruppen, viele sinnvolle Entitäten |
| **Escape Room Creator** | Nutzer bauen digitale Rätselräume und lassen andere sie spielen | Kreativ, ungewöhnlich, CRUD + spielerischer Ablauf kombinierbar |
| **Mystery Case App** | Fälle lösen, Hinweise sammeln und Inhalte freischalten | Storytelling + Gamification, technisch trotzdem überschaubar |
| **Idea Board** | Ideen einreichen, voten, kommentieren und durch Statusphasen bewegen | Sehr gutes CRUD, Rollen, Activity Feed und Events naheliegend |
| **Habit / Goal Game** | Ziele als Quests, XP, Levels, Streaks und Achievements | Hoher Motivationsfaktor, Dashboard und Statistik sehr passend |
| **Mini Marketplace** | Angebote erstellen, suchen, favorisieren und reservieren | Klassische Web-App-Struktur, viele reale Interaktionen, gut erweiterbar |

## Elemente, die fast immer sinnvoll sind

- Login / Registrierung
- Dashboard
- Suche + Filter
- Detailansichten
- Create / Edit / Delete
- Tabelle **oder** Karten-/Board-Ansicht
- Statistiken / Charts
- Activity Feed
- Rollen / Berechtigungen
- Mobile Navigation
- Benachrichtigungen / Events
- RabbitMQ/Kafka für z. B. `entity.created`, `reservation.created`, `challenge.completed`

## Aktuell stärkste Kandidaten

1. **Tournament Hub** – technisch klar, optisch stark, sehr gut fürs Interview  
2. **Challenge App** – spielerisch und motivierend  
3. **Escape Room Creator** – kreativ und ungewöhnlich  
4. **Collection Tracker** – einfach startbar, aber stark ausbaubar  
5. **Trip Planner** – realer Nutzen und sehr gute Mobile-UX
