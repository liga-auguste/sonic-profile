"""
sonic_db.py — SQLite helper for the Sonic data pipeline.

Schema:
  artists(id PK, name, image, genres JSON, followers, first_seen_at)
  tracks(id PK, name, artist, artists JSON, album, album_image,
         duration_ms, explicit, release_date, url, first_seen_at)
  plays(played_at PK, track_id, track_name, artist)
"""

import json
import os
import sqlite3
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sonic.db")


def get_connection(db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS artists (
            id            TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            image         TEXT DEFAULT '',
            genres        TEXT DEFAULT '[]',
            followers     INTEGER DEFAULT 0,
            first_seen_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tracks (
            id            TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            artist        TEXT NOT NULL,
            artists       TEXT DEFAULT '[]',
            album         TEXT NOT NULL,
            album_image   TEXT DEFAULT '',
            duration_ms   INTEGER DEFAULT 0,
            explicit      INTEGER DEFAULT 0,
            release_date  TEXT DEFAULT '',
            url           TEXT DEFAULT '',
            first_seen_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS plays (
            played_at  TEXT PRIMARY KEY,
            track_id   TEXT NOT NULL,
            track_name TEXT NOT NULL,
            artist     TEXT NOT NULL
        );
    """)
    conn.commit()


def _now():
    return datetime.now(timezone.utc).isoformat()


def upsert_artists(conn, artists, now=None):
    """INSERT OR IGNORE — preserves first_seen_at for known artists."""
    ts = now or _now()
    conn.executemany(
        """INSERT OR IGNORE INTO artists (id, name, image, genres, followers, first_seen_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        [
            (
                a["id"],
                a["name"],
                a.get("image", ""),
                json.dumps(a.get("genres", [])),
                a.get("followers", 0),
                ts,
            )
            for a in artists
        ],
    )
    conn.commit()


def upsert_tracks(conn, tracks, now=None):
    """INSERT OR IGNORE — preserves first_seen_at for known tracks."""
    ts = now or _now()
    conn.executemany(
        """INSERT OR IGNORE INTO tracks
           (id, name, artist, artists, album, album_image, duration_ms, explicit, release_date, url, first_seen_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                t["id"],
                t["name"],
                t["artist"],
                json.dumps(t.get("artists", [])),
                t["album"],
                t.get("album_image", ""),
                t.get("duration_ms", 0),
                1 if t.get("explicit") else 0,
                t.get("release_date", ""),
                t.get("url", ""),
                ts,
            )
            for t in tracks
        ],
    )
    conn.commit()


def upsert_plays(conn, recently_played):
    """INSERT OR IGNORE plays from recently_played list (raw Spotify format)."""
    rows = []
    for entry in recently_played:
        track = entry.get("track", {})
        if not track.get("id"):
            continue
        artist = ", ".join(a["name"] for a in track.get("artists", []))
        rows.append((entry["played_at"], track["id"], track.get("name", ""), artist))
    conn.executemany(
        "INSERT OR IGNORE INTO plays (played_at, track_id, track_name, artist) VALUES (?, ?, ?, ?)",
        rows,
    )
    conn.commit()
    return len(rows)


def get_genres_map(conn):
    """Returns {artist_id: [genre, ...]} for all artists that have genres in DB."""
    rows = conn.execute(
        "SELECT id, genres FROM artists WHERE genres != '[]' AND genres IS NOT NULL"
    ).fetchall()
    return {r["id"]: json.loads(r["genres"]) for r in rows}


def get_artist_ids_in_db(conn):
    """Returns set of all artist IDs currently in the DB."""
    rows = conn.execute("SELECT id FROM artists").fetchall()
    return {r["id"] for r in rows}


def update_artist_genres(conn, artist_id, genres):
    conn.execute(
        "UPDATE artists SET genres = ? WHERE id = ?",
        (json.dumps(genres), artist_id),
    )
    conn.commit()


def get_hours_chart(conn):
    """Returns list of 24 ints: play count per local hour."""
    rows = conn.execute("SELECT played_at FROM plays").fetchall()
    counts = [0] * 24
    for row in rows:
        try:
            dt_utc = datetime.fromisoformat(row["played_at"].replace("Z", "+00:00"))
            counts[dt_utc.astimezone().hour] += 1
        except Exception:
            pass
    return counts


def count_artists(conn):
    return conn.execute("SELECT COUNT(*) FROM artists").fetchone()[0]


def count_tracks(conn):
    return conn.execute("SELECT COUNT(*) FROM tracks").fetchone()[0]


def migrate_from_json(conn, history_path=None, cumulative_path=None):
    """
    One-time migration of legacy JSON files into the DB.
    Safe to call repeatedly — INSERT OR IGNORE prevents duplicates.
    """
    if history_path and os.path.exists(history_path):
        with open(history_path, encoding="utf-8") as f:
            history = json.load(f)
        added = upsert_plays(conn, [
            {"played_at": e["played_at"], "track": e.get("track", {})}
            for e in history
        ])
        print(f"  Migrated {added} plays from {os.path.basename(history_path)}")

    if cumulative_path and os.path.exists(cumulative_path):
        SENTINEL = "2000-01-01T00:00:00+00:00"
        with open(cumulative_path, encoding="utf-8") as f:
            cum = json.load(f)
        artist_ids = cum.get("artist_ids", [])
        track_ids  = cum.get("track_ids", [])
        conn.executemany(
            "INSERT OR IGNORE INTO artists (id, name, first_seen_at) VALUES (?, ?, ?)",
            [(aid, f"[legacy:{aid[:8]}]", SENTINEL) for aid in artist_ids],
        )
        conn.executemany(
            "INSERT OR IGNORE INTO tracks (id, name, artist, album, first_seen_at) VALUES (?, ?, ?, ?, ?)",
            [(tid, f"[legacy:{tid[:8]}]", "", "", SENTINEL) for tid in track_ids],
        )
        conn.commit()
        print(f"  Migrated {len(artist_ids)} artist IDs and {len(track_ids)} track IDs from {os.path.basename(cumulative_path)}")
