# Sonic — Projektdokumentation

## Projektübersicht

Sonic ist ein persönliches Spotify-Statistik-Portfolio. Es zeigt Ligas eigene Hördaten schön aufbereitet an. Keine Live-Logins für Besucher — alle Daten sind ein kuratierter Snapshot.

---

## Datenquellen & Pipeline

### Woher kommen die Daten?

```
Spotify API ──► spotify_fetch.py ──► spotify_data_YYYYMMDD.json
                      │
                      └──► listening_history.json  (akkumulierend, täglich)
                      │
Last.fm API ──► genre_resolver.py ──► (enriched in-place)
                      │
                      ▼
              generate_data.py
                      │
                      ▼
        frontend/src/data/spotifyData.js  (statisch, vom Frontend genutzt)
        frontend/src/data/vennData.js
```

---

### Spotify API — was wir fetchen

Alle Calls laufen über `spotify_fetch.py` mit OAuth2 Bearer Token.

#### Endpoints

| Endpoint | Was wir holen | Einschränkung |
|---|---|---|
| `GET /me` | Profil: Name, Land, Plan, Follower | — |
| `GET /me/top/tracks?time_range=short_term&limit=50` | Top 50 Tracks letzte ~4 Wochen | Kein Play Count |
| `GET /me/top/tracks?time_range=medium_term&limit=50` | Top 50 Tracks letzte ~6 Monate | Kein Play Count |
| `GET /me/top/tracks?time_range=long_term&limit=50` | Top 50 Tracks all-time | Kein Play Count |
| `GET /me/top/artists?time_range=*&limit=50` | Top Artists (3× wie oben) | `genres` meist leer |
| `GET /artists?ids=...` | Artist-Details (Batch, max 50) | Für genres/followers/popularity |
| `GET /me/player/recently-played?limit=50` | Letzte 50 gespielten Tracks mit Timestamp | Max. 50, kein Paging |
| `GET /me/player/currently-playing` | Aktuell laufender Track | Kann leer sein |

#### Felder pro Track (top_tracks)
- `id`, `name`, `uri`
- `artists[]` — Name + ID
- `album` — Name, `album_type`, `release_date`, `images[]`
- `duration_ms`, `explicit`, `popularity`

#### Felder pro Artist (nach Batch-Enrichment)
- `id`, `name`, `images[]`
- `genres[]` — oft leer (Spotify-Limitation, daher Last.fm Fallback)
- `followers.total`, `popularity`

#### Felder pro recently_played Eintrag
- `played_at` — ISO 8601 Timestamp (UTC)
- `track` — vollständiges Track-Objekt (wie oben)

#### Was Spotify grundsätzlich NICHT liefert
- ❌ Play Counts (nicht über API zugänglich)
- ❌ Vollständige Hörhistorie (max. 50 recently played, kein Paging)
- ❌ Genaue Listening Minutes
- ❌ Wrapped-Daten / Jahresstatistiken

---

### Last.fm API — Genre-Workaround

Spotify lässt `genres` bei vielen Artists leer. Fallback-Kette:

```
1. Spotify genres (aus /v1/artists/{id}) → meist leer
2. Last.fm artist.getTopTags → gibt community-basierte Genre-Tags
3. Leer (unbekannt) — für sehr nischige Artists
```

Implementiert in `genre_resolver.py`:
- Endpoint: `api.lastfm.com/2.0/?method=artist.getTopTags`
- Noise-Tags werden gefiltert ("seen live", "favorites", etc.)
- Max. 5 Tags pro Artist werden behalten
- Rate Limit: 0.25s zwischen Requests

Key in `.env` als `LASTFM_API_KEY`.

---

### Listening History — Akkumulation

`listening_history.json` wächst täglich durch den Cron Job:

- Jeder Fetch hängt neue `recently_played` Einträge an
- Deduplizierung via `played_at` Timestamp — kein Datenverlust bei doppeltem Fetch
- Sortiert: neueste Einträge zuerst
- Nach ~4 Wochen täglichem Fetch: ~800–1.200 Einträge
- Basis für: Stunden-Chart, Streak Calendar, Play Counts, Wochentag-Verteilung

---

### Podcast / Hörbuch Filter

Alle Track-Listen werden gefiltert durch `is_music_track()` in `spotify_fetch.py`:

```python
# Rausfiltern wenn:
item.type != "track"              # Podcast-Episoden
item.album.album_type == "audiobook"  # Hörbücher
item.duration_ms > 30 * 60 * 1000    # Tracks > 30 Min (Hörbuch-Kapitel)
```

---

## Skripte

### `spotify_fetch.py`
Fetcht alle Daten von Spotify. Zwei Modi:
- **Interaktiv** (Browser): wenn `SPOTIFY_REFRESH_TOKEN` nicht gesetzt
- **CI/Cron** (kein Browser): wenn `SPOTIFY_REFRESH_TOKEN` in Umgebung gesetzt

```bash
source .venv/bin/activate
python spotify_fetch.py
```

Gibt aus:
- `spotify_data_YYYYMMDD_HHMMSS.json` — aktueller Snapshot
- `listening_history.json` — akkumulierende History (wird erweitert)

Zeigt einmalig den `SPOTIFY_REFRESH_TOKEN` für GitHub Secrets.

### `genre_resolver.py`
Reichert Artist-Genres via Last.fm an (in-place im JSON):

```bash
python genre_resolver.py spotify_data_YYYYMMDD_HHMMSS.json
```

### `generate_data.py`
Konvertiert JSON → `frontend/src/data/spotifyData.js` und `vennData.js`.
Berechnet alle Stats (avg duration, explicit count, genre-Verteilung, etc.)

```bash
python generate_data.py
```

---

## Environment Variables

| Variable | Wofür |
|---|---|
| `SPOTIFY_CLIENT_ID` | Spotify App |
| `SPOTIFY_CLIENT_SECRET` | Spotify App |
| `SPOTIFY_FETCH_REDIRECT_URI` | spotify_fetch.py Callback (`http://127.0.0.1:9009/callback`) |
| `SPOTIFY_REFRESH_TOKEN` | Für Cron/CI ohne Browser |
| `LASTFM_API_KEY` | Last.fm Genre-Lookup |

> Django-Backend wurde entfernt — `SPOTIFY_REDIRECT_URI` wird nicht mehr benötigt.

---

## Server starten (lokal)

Kein Backend mehr nötig — das Frontend läuft komplett statisch.

```bash
cd ~/coding-projects/sonic/frontend
npm run dev
# → http://localhost:5174
```

Für Production Build:
```bash
npm run build
# → dist/ (deploy this)
```

---

## Status

**Fertige Sections:**
- 01 · Profile — statische Daten
- 02 · Tracks — Range-Toggle (short / medium / long term)
- 03 · Artists — Range-Toggle
- 04 · Genres — SOUND_DNA curated + artist_universe Bubble-Chart aus echten Daten
- 05 · Stats — alle Karten live, Venn-Diagramm live

**Entfernt:** Django-Backend, Live-Login, Now Playing, Playlists-Section

---

## Offene TODOs (in Reihenfolge)

- [ ] **1. Deployment** — Vercel Static Site live schalten (siehe unten)
- [ ] **2. README** — Screenshot + kurze Erklärung im Repo, bevor Links geteilt werden
- [ ] **3. TypeScript** — `.jsx` → `.tsx`, Typen für Datenstrukturen definieren, kein `any`
- [ ] **4. Tests** — Unit Tests für `generate_data.py` (genre bucketing, venn, stats), ggf. Komponenten-Tests
- [ ] **5. SQLite + Timeline** — `artists` und `tracks` Tabellen mit `first_seen_at` ersetzen die JSON-Akkumulation; `INSERT OR IGNORE` stellt sicher dass nur neue IDs hinzugefügt werden und `first_seen_at` nie überschrieben wird; Last.fm-Enrichment läuft nur für neue Artists (~90% weniger API-Requests nach Einlaufphase); ermöglicht Timeline-Ansicht ("wann kam welcher Artist/Track in den Pool")

---

## Deployment

Ziel: **Vercel** — nur Static Site, kein Backend.

**Vercel-Einstellungen:**
- Root Directory: `frontend/`
- Build Command: `npm run build`
- Output Directory: `dist`

**Checkliste:**
- [ ] Vercel-Projekt anlegen + Git-Repo verbinden
- [ ] GitHub Actions Secrets eintragen: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`, `LASTFM_API_KEY`
- [ ] Cron Job testen (workflow_dispatch in GitHub UI)
- [ ] `axios` und `react-router-dom` aus `package.json` entfernen (werden nicht verwendet)

**GitHub Actions Cron Job** ist fertig (`.github/workflows/update_data.yml`):
- Läuft täglich 06:00 UTC
- Fetcht Spotify → enriched Genres → generiert JS-Dateien → committed ins Repo
- Vercel deployed automatisch bei jedem Push auf `main`

**`listening_history.json`** wird vom Cron Job committed — bleibt im Repo (ist Datengrundlage).
