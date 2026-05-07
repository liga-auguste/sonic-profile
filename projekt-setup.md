# My Sonic Profile – Projektplanung

## Stack
- **Frontend:** React + Recharts → Vercel
- **Backend:** Django REST Framework → Render (Web Service)
- **WebSockets:** Django Channels + Redis → Render (Redis Add-on)
- **API:** Spotify Web API (OAuth, Top Artists/Tracks, Genre Stats, Currently Playing)

## Deployment
- **Alles auf Render** (nicht Railway wie ursprünglich geplant)
  - Grund: Liga hat bereits laufende Render-Infrastruktur ($13/Monat für DB + Smart)
  - Railway hat keinen dauerhaften Free Tier (nur 30-Tage-Trial, dann min. $5/Monat)
  - Beide Plattformen haben Sleep-Problem im Free Tier (Render 15min, Railway 10min)
  - Für Always-On (wichtig für WebSocket "Currently Playing") → Render paid tier ~$7/Monat
- **Frontend:** Vercel (oder ebenfalls Render, optional)

## Spotify App Registration
- **App Name:** My Sonic Profile
- **Website:** https://sonic.ligaauguste.de (Subdomain noch nicht live — ist okay)
- **Redirect URIs:**
  - `http://localhost:3000/callback`
  - `http://localhost:8000/callback`
  - `https://dein-backend.onrender.com/callback`
  - `https://sonic.ligaauguste.de/callback`
- **API:** Web API auswählen
- **Quota Mode:** Development Mode reicht (max. 25 Test-User — für Portfolio okay)

## Benötigte Spotify Scopes
```
user-top-read
user-read-currently-playing
user-read-playback-state
user-read-private
user-read-email
```

## Wichtige Spotify API Hinweise (Stand Mai 2026)
- `GET /me/top/tracks` und `GET /me/top/artists` sind weiterhin verfügbar ✅
- `GET /artists/{id}/top-tracks` wurde im Februar 2026 entfernt ❌
- Extended Quota Mode erfordert seit März 2025 eine registrierte Organisation → nicht relevant für Portfolio

## Timeline
4–6 Wochen

---

## Prozess: Wie ich zum Prototypen gekommen bin

### 1. Planung & Stack-Entscheidung
Ich habe den Tech-Stack definiert (React + Recharts, Django, WebSockets, Spotify API) und das Deployment von Railway auf **Render** umgestellt, weil ich dort bereits Infrastruktur laufen habe ($13/Monat für DB + andere Projekte) und den Sleep-Pain schon kenne. Railway hat außerdem keinen dauerhaften Free Tier mehr.

### 2. Spotify App registrieren
Ich habe die App im Spotify Developer Dashboard registriert — mit dem wichtigen Hinweis dass `localhost` nicht mehr erlaubt ist und stattdessen `127.0.0.1` genutzt werden muss. Ich habe die nötigen Scopes definiert (`user-top-read`, `user-read-currently-playing` etc.) und die aktuellen API-Einschränkungen aus dem Februar 2026 berücksichtigt. Als Website habe ich `https://sonic.ligaauguste.de` eingetragen, auch wenn die Subdomain noch nicht live ist — das ist erlaubt.

### 3. Echte Daten holen
Claude hat ein Python-Script gebaut das über OAuth meine echten Spotify-Daten als JSON herunterlädt. Nach einem kleinen SSL-Fix für macOS/Python 3.13 (`/Applications/Python\ 3.13/Install\ Certificates.command`) hat es funktioniert und ich hatte meine `spotify_data_20260506_183006.json` mit 50 Top Tracks und 50 Top Artists über 3 Zeiträume.

### 4. Daten analysieren
Wir haben die JSON analysiert und festgestellt dass Spotify im Dev Mode keine Genre- und Popularity-Daten mehr liefert (seit Februar 2026). Trotzdem konnten wir aus den vorhandenen Daten eine echte Genre-DNA ableiten:
- Classical / Baroque: **50%**
- Indie / Singer-Songwriter: **31%**
- Funk / Electronic: **9%**
- Jazz / Ambient: **7%**
- Hip-Hop / R&B: **3%**

Weitere interessante Stats: Ø Track-Länge 3:59 min, nur 7/150 Tracks explicit, Top Artists über alle Zeiträume: Tom Misch, Common Saints, Tom Odell.

### 5. Prototyp in Claude Design
Mit einem detaillierten Prompt habe ich in **Claude Design** (Anthropic Labs, Research Preview) einen High-Fidelity Prototyp gebaut — dark theme, 5 Sections:
1. Profile + Currently Playing (WebSocket)
2. Top Tracks mit 3 Zeitraum-Toggles
3. Top Artists
4. Genre DNA
5. Listening Stats

**Iterationen:**
- Den Artist Universe Bubble Chart mit echten Achsen neu designed: X = Konsistenz über Zeit, Y = Track- vs. Artist-Präsenz, Größe = Häufigkeit aus echten Daten
- "Tops over time" Bar Chart als inhaltlich irreführend identifiziert (alle Balken zeigen 50, weil die API nur Snapshots liefert) → wird durch ein Overlap-Chart ersetzt
- Text-Overflow bei Bubble Labels gelöst → keine Labels direkt auf Bubbles, nur Hover-Tooltips

**Nächster Schritt:** Handoff to Claude Code → echten React-Code aus dem Prototyp generieren und mit echten JSON-Daten befüllen.

---

## Finale Produkt-Vision

### Problem Statement
> "Ich kann in Spotify nicht unterscheiden, welche Playlists von mir sind und welche von Spotify generiert wurden. Alles ist in einer scrollbaren Seitenleiste vermischt — eigene Playlists, Spotify-generierte Mixes ('Für Liga'), und gespeicherte fremde Playlists."

### Kern-Feature: Playlist-Manager
Das ist der echte Nutzen des Tools. Beim ersten Login landet der User direkt hier.

**Zwei Kategorien — klar und eindeutig:**
- 📁 **Meine Playlists** (`owner.id === meine_user_id`) → Lieblingssongs + eigene Playlists
- 📁 **Nicht meine** (alles andere) → Spotify-generierte ("Für Liga"), fremde Playlists

**Aktionen:**
- Eigene Playlists → Tracks anzeigen, löschen, neu anordnen
- Lieblingssongs → einzelne Tracks entfernen
- Spotify-generierte + fremde → entfolgen

### Nice-to-have: Listening Stats
Nach dem Onboarding als Belohnungsmoment — wie ein Spotify Wrapped das immer verfügbar ist, nicht nur einmal im Jahr. Leute mögen diese Statistiken weil sie Hören zu einer Identität machen.

### Zwei Modi für die Demo

**Ohne Login → Demo-Modus**
- Besucher sehen meine echten Listening-Stats (Top Artists, Genre DNA, etc.)
- Sehen eine Vorher/Nachher-Demo des Playlist-Managers mit Mock-Daten
- Können nichts verändern, nur anschauen

**Mit eigenem Spotify Premium Login → Live-Modus**
- User sehen ihre eigenen Stats
- Können ihre eigenen Playlists wirklich aufräumen
- Änderungen gehen direkt in ihren Spotify-Account
- Im Development Mode auf 25 freigeschaltete User begrenzt

### Technische Basis
- Kategorisierung über `owner.id` aus der Spotify API
- `owner.id === "spotify"` → Spotify-generiert
- `owner.id === meine_user_id` → eigene Playlist
- alles andere → fremde Playlist
- Playlist-Inhalte nur für eigene Playlists verfügbar (API-Limitation seit Feb 2026)
- Entfolgen für alle nicht-eigenen Playlists möglich

### Positionierung gegenüber bestehenden Tools
Tools wie Spotify Dedup, Skiley, Organize Your Music lösen andere Probleme (Duplikate, Sortierung nach BPM etc.). Kein Tool löst das spezifische Problem der **Kategorisierung und Übersicht** — was ist meins, was ist Spotifys.

### Interview-Story
> "Ich hatte ein echtes Problem: meine Spotify-Seitenleiste war unübersichtlich weil alles gemischt war. Ich hab ein Tool gebaut das genau das löst — und eine Belohnungsschicht mit Listening Stats draufgelegt die Leute motiviert wiederzukommen. Du kannst dir meine Demo-Daten anschauen, oder ich schalte dich frei und du kannst es mit deinem eigenen Account ausprobieren."

---

## Datenmodell: "Zuletzt gehört"

### Was die API liefert

**Recently Played Tracks** (`GET /me/player/recently-played`)
- Gibt zuletzt gespielte Tracks mit Datum und Uhrzeit zurück
- Limit: maximal 50 Tracks → reicht nur für die letzten Stunden/Tage
- Scope: `user-read-recently-played`

**`added_at` pro Track in einer Playlist**
- Für jeden Track in einer eigenen Playlist gibt es `added_at` — wann der Track hinzugefügt wurde
- Nicht "zuletzt gehört" aber nützlich: "dieser Track ist seit 2019 in deiner Playlist"

### Was nicht geht
- Wann eine Playlist zuletzt geöffnet/gespielt wurde → nicht in der API
- Vollständige Hörhistorie über 50 Tracks hinaus → nicht verfügbar

### Workaround für "wahrscheinlich vergessen"
Kombination aus beiden Quellen als Indikator:
- `added_at` der Tracks → "diese Playlist hat Tracks die du vor 3+ Jahren hinzugefügt hast"
- Recently Played → "keiner dieser Tracks war in deinen letzten 50 gespielten Songs"

→ Daraus lässt sich ein "wahrscheinlich vergessen"-Label ableiten, das dem User hilft zu entscheiden ob eine Playlist noch relevant ist.
