# Sonic

A personal Spotify stats portfolio — my listening data, visualized.

![Sonic screenshot](docs/screenshot.png)

**[sonic.ligaauguste.de](https://sonic.ligaauguste.de)**

---

## What it shows

- **Genre DNA** — genre distribution across top artists, with an artist universe chart tracking movement across time ranges
- **Top Artists** — ranked by short, medium, and long-term listening
- **Top Tracks** — with a "diverse" mode that filters duplicate albums
- **Listening Stats** — play counts, streak calendar, hourly patterns, and a Venn diagram of cross-range artists

## How it works

No live login for visitors. All data is a curated snapshot of my own Spotify account, updated daily via GitHub Actions:

```
Spotify API → spotify_fetch.py → genre_resolver.py (Last.fm) → generate_data.py → static JS files
```

The frontend is a fully static React app — no backend, no database.

## Stack

- **Frontend** — React + Vite, plain CSS
- **Data pipeline** — Python, Spotify API, Last.fm API
- **Hosting** — Vercel
- **Updates** — GitHub Actions cron (daily at 06:00 UTC)

## Local setup

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5174
```

To refresh data manually:

```bash
source venv/bin/activate
python spotify_fetch.py
python genre_resolver.py spotify_data_*.json
python generate_data.py
```

Requires a `.env` with `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`, and `LASTFM_API_KEY`.
