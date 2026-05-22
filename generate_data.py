#!/usr/bin/env python3
"""
generate_data.py — Spotify JSON snapshot → frontend JS data files

Usage:
    python generate_data.py                          # uses latest spotify_data_*.json
    python generate_data.py spotify_data_XYZ.json   # use specific snapshot
"""

import json
import sys
import glob
import os
import hashlib
from datetime import datetime, timezone


# ── helpers ──────────────────────────────────────────────────────────────────

def fmt_ms(ms):
    """197142 → '3:17'"""
    total_s = ms // 1000
    return f"{total_s // 60}:{total_s % 60:02d}"


def pick_image(images, preferred_height=300):
    """Pick closest image to preferred_height, fallback to first."""
    if not images:
        return ""
    for img in images:
        if img.get("height") == preferred_height:
            return img["url"]
    return images[0]["url"]


def latest_snapshot():
    files = sorted(glob.glob("spotify_data_*.json"))
    if not files:
        raise FileNotFoundError("No spotify_data_*.json found in current directory")
    return files[-1]


# ── transformers ─────────────────────────────────────────────────────────────

def transform_track(track, rank):
    artists = [a["name"] for a in track["artists"]]
    return {
        "rank": rank,
        "id": track["id"],
        "name": track["name"],
        "artists": artists,
        "artist": ", ".join(artists),
        "album": track["album"]["name"],
        "album_image": pick_image(track["album"]["images"]),
        "duration_ms": track["duration_ms"],
        "explicit": track.get("explicit", False),
        "release_date": track["album"]["release_date"],
        "url": track["external_urls"]["spotify"],
    }


def transform_artist(artist, rank):
    return {
        "rank": rank,
        "id": artist["id"],
        "name": artist["name"],
        "image": pick_image(artist.get("images", [])),
        "genres": artist.get("genres", []),
        "followers": artist.get("followers", {}).get("total", 0),
        "url": artist["external_urls"]["spotify"],
    }


def transform_tracks_range(raw):
    items = raw.get("items", [])
    return [transform_track(t, i + 1) for i, t in enumerate(items)]


def transform_artists_range(raw):
    items = raw.get("items", [])
    return [transform_artist(a, i + 1) for i, a in enumerate(items)]


# ── stats ─────────────────────────────────────────────────────────────────────

def compute_stats(top_tracks_all_ranges, top_artists_long, fetched_at):
    # collect all unique tracks across all 3 ranges
    seen_ids = set()
    all_tracks = []
    for tracks in top_tracks_all_ranges:
        for t in tracks:
            if t["id"] not in seen_ids:
                seen_ids.add(t["id"])
                all_tracks.append(t)

    unique_tracks = len(all_tracks)
    explicit_count = sum(1 for t in all_tracks if t.get("explicit"))

    avg_ms = sum(t["duration_ms"] for t in all_tracks) // len(all_tracks) if all_tracks else 0
    avg_track_length = fmt_ms(avg_ms)

    longest = max(all_tracks, key=lambda t: t["duration_ms"]) if all_tracks else None
    longest_track = fmt_ms(longest["duration_ms"]) if longest else ""
    longest_track_name = longest["name"] if longest else ""

    # unique artists across all 3 artist ranges
    all_artist_names = set()
    for artists in top_artists_long:
        for a in artists:
            all_artist_names.add(a["name"])

    # oldest obsession = rank 1 in long_term artists
    oldest_obsession = top_artists_long[2][0]["name"] if top_artists_long[2] else ""

    # newest release = track with latest release_date across all ranges
    def parse_date(d):
        # handles "2024-11-01", "2024", "2024-11"
        parts = d.split("-")
        if len(parts) == 1:
            return datetime(int(parts[0]), 1, 1)
        if len(parts) == 2:
            return datetime(int(parts[0]), int(parts[1]), 1)
        return datetime(int(parts[0]), int(parts[1]), int(parts[2]))

    newest = max(all_tracks, key=lambda t: parse_date(t["release_date"])) if all_tracks else None
    newest_release = f"{newest['name']} — {newest['artist']}" if newest else ""

    # release year distribution
    years = []
    for t in all_tracks:
        try:
            years.append(parse_date(t["release_date"]).year)
        except Exception:
            pass
    release_year_oldest = min(years) if years else None
    release_year_newest = max(years) if years else None
    release_year_peak   = max(set(years), key=years.count) if years else None

    return {
        "uniqueArtists": len(all_artist_names),
        "uniqueTracks": unique_tracks,
        "avgTrackLength": avg_track_length,
        "longestTrack": longest_track,
        "longestTrackName": longest_track_name,
        "explicitCount": explicit_count,
        "oldestObsession": oldest_obsession,
        "newestRelease": newest_release,
        "releaseYearOldest": release_year_oldest,
        "releaseYearNewest": release_year_newest,
        "releaseYearPeak":   release_year_peak,
        "fetched_at": fetched_at,
    }


# ── venn data ─────────────────────────────────────────────────────────────────

def compute_venn(short_artists, medium_artists, long_artists):
    S = {a["name"] for a in short_artists}
    M = {a["name"] for a in medium_artists}
    L = {a["name"] for a in long_artists}

    regions = {
        "S_only": S - M - L,
        "M_only": M - S - L,
        "L_only": L - S - M,
        "SM":     (S & M) - L,
        "SL":     (S & L) - M,
        "ML":     (M & L) - S,
        "ALL":    S & M & L,
    }

    # for list display: sort alphabetically, keep reasonable number
    result = {}
    counts = {}
    for key, names in regions.items():
        sorted_names = sorted(names)
        result[key] = sorted_names
        counts[key] = len(sorted_names)

    result["counts"] = counts
    return result


# ── currently playing ─────────────────────────────────────────────────────────

def transform_currently_playing(raw):
    if not raw or not raw.get("item"):
        return None
    item = raw["item"]
    artists = [a["name"] for a in item.get("artists", [])]
    return {
        "is_playing": raw.get("is_playing", False),
        "progress_ms": raw.get("progress_ms", 0),
        "duration_ms": item.get("duration_ms", 0),
        "name": item.get("name", ""),
        "artist": ", ".join(artists),
        "album": item["album"]["name"] if "album" in item else "",
        "album_image": pick_image(item["album"]["images"]) if "album" in item else "",
        "url": item["external_urls"]["spotify"],
        "context_type": raw.get("context", {}).get("type", "") if raw.get("context") else "",
    }


# ── artist universe ───────────────────────────────────────────────────────────

def _jitter(name, salt, spread=0.08):
    """Deterministic jitter ±spread based on name hash."""
    h = int(hashlib.md5((name + salt).encode()).hexdigest(), 16)
    return (h % 1000) / 1000 * spread * 2 - spread


def compute_artist_universe(short_tracks, medium_tracks, long_tracks,
                             short_artists, medium_artists, long_artists, max_bubbles=22):
    """
    For each artist across all 6 lists, compute bubble chart position:
    - x  = consistency: how many of the 3 artist-range lists they appear in (0..1)
    - y  = tracks-heavy: how many of the 3 track-range lists they appear in (0..1)
    - size = total list appearances (1..6), scaled for display
    - era = "recent obsession" | "long-time favorite"
    - hue = 332 (recent) | 168 (long-time)
    """
    # Build lookup: artist name → set of lists they're in
    # Keys: "sa"=short_artists, "ma"=medium_artists, "la"=long_artists,
    #       "st"=short_tracks, "mt"=medium_tracks, "lt"=long_tracks
    presence = {}

    def add_artist(name, key):
        if name not in presence:
            presence[name] = set()
        presence[name].add(key)

    for a in short_artists:   add_artist(a["name"], "sa")
    for a in medium_artists:  add_artist(a["name"], "ma")
    for a in long_artists:    add_artist(a["name"], "la")

    for t in short_tracks:
        for name in t["artists"]:  add_artist(name, "st")
    for t in medium_tracks:
        for name in t["artists"]:  add_artist(name, "mt")
    for t in long_tracks:
        for name in t["artists"]:  add_artist(name, "lt")

    artist_data = []
    for name, keys in presence.items():
        artist_ranges = len(keys & {"sa", "ma", "la"})
        track_ranges  = len(keys & {"st", "mt", "lt"})
        total         = artist_ranges + track_ranges

        # skip artists that only appear in a single track list (too minor)
        if total < 2:
            continue

        # x: consistency across artist-range lists (0.33..1.0 for artists appearing in 1..3 ranges)
        # if not in any artist list but in 2+ track lists: x based on track consistency
        if artist_ranges > 0:
            x_base = artist_ranges / 3
        else:
            x_base = track_ranges / 3 * 0.5  # track-only artists cluster left-center

        # y: tracks-heavy ratio
        if total > 0:
            y_base = track_ranges / 3
        else:
            y_base = 0.5

        # clamp to [0.05, 0.95] before jitter
        x = max(0.05, min(0.95, x_base + _jitter(name, "x")))
        y = max(0.05, min(0.95, y_base + _jitter(name, "y")))

        # size: scale total (2..6) → display size (4..15)
        size = 4 + int((total - 2) * 11 / 4)
        size = max(4, min(15, size))

        # era: in long-term artist list → long-time favorite, else recent obsession
        if "la" in keys:
            era = "long-time favorite"
            hue = 185   # teal
        else:
            era = "recent obsession"
            hue = 340   # rose

        artist_data.append({
            "name": name,
            "x": round(x, 3),
            "y": round(y, 3),
            "size": size,
            "era": era,
            "hue": hue,
        })

    # sort by size desc, take top N
    artist_data.sort(key=lambda a: (-a["size"], a["name"]))
    return artist_data[:max_bubbles]


# ── genre DNA ─────────────────────────────────────────────────────────────────

# (name, hue, chroma, keywords)
GENRE_BUCKET_DEFS = [
    ("classical / baroque", 280, 0.03, {"classical", "baroque", "choral", "choir", "orchestra", "chamber",
                                         "early music", "contemporary classical", "neoclassical", "romantic",
                                         "opera", "oratorio", "conductor", "sacred", "musica sacra"}),
    ("soul / R&B",           18, 0.16, {"soul", "neo-soul", "rnb", "r&b", "rhythm and blues", "philly soul",
                                         "nu soul", "motown"}),
    ("jazz",                210, 0.15, {"jazz", "nu-jazz", "nu jazz", "vocal jazz", "saxophone",
                                         "contemporary jazz", "bossa", "swing", "ecm"}),
    ("indie / folk",        140, 0.15, {"indie", "singer-songwriter", "folk", "acoustic", "indie pop",
                                         "indie folk", "indie rock", "dream pop", "bedroom pop", "alternative",
                                         "post-punk", "art rock", "lo-fi", "art pop"}),
    ("electronic",          265, 0.15, {"electronic", "house", "techno", "downtempo", "ambient",
                                         "indietronica", "dance", "synthpop", "deep house", "experimental",
                                         "electro", "glitch"}),
    ("hip-hop",             320, 0.15, {"hip-hop", "hip hop", "rap", "grime"}),
    ("funk / psychedelic",   58, 0.15, {"funk", "disco", "afrobeat", "psychedelic", "psychedelic rock",
                                         "surf funk", "surf rock", "psychedelic soul"}),
]


def compute_genre_dna(short_artists, medium_artists, long_artists):
    """
    Compute genre distribution from Last.fm tags, weighted by artist rank + range presence.
    Returns list of genre buckets: {name, share, hue, artists}.
    """
    # Merge artists across all ranges: id → {name, genres, ranks[]}
    artist_map = {}
    for term_artists in [short_artists, medium_artists, long_artists]:
        for a in term_artists:
            if a["id"] not in artist_map:
                artist_map[a["id"]] = {
                    "name":   a["name"],
                    "genres": a.get("genres", []),
                    "ranks":  [],
                }
            artist_map[a["id"]]["ranks"].append(a["rank"])

    bucket_weights = {b[0]: 0.0 for b in GENRE_BUCKET_DEFS}
    bucket_artists  = {b[0]: []  for b in GENRE_BUCKET_DEFS}

    for info in artist_map.values():
        tags = {g.lower() for g in info["genres"]}
        best_rank    = min(info["ranks"])
        range_count  = len(info["ranks"])
        weight       = (1 - best_rank / 51) * range_count

        for bucket_name, _, _chroma, keywords in GENRE_BUCKET_DEFS:
            if tags & keywords:
                bucket_weights[bucket_name] += weight
                bucket_artists[bucket_name].append((weight, info["name"]))
                break  # first match wins

    total = sum(bucket_weights.values())
    if total == 0:
        return []

    result = []
    for bucket_name, hue, chroma, _ in GENRE_BUCKET_DEFS:
        w = bucket_weights[bucket_name]
        if w == 0:
            continue
        top_artists = [n for _, n in sorted(bucket_artists[bucket_name], reverse=True)[:4]]
        result.append({
            "name":    bucket_name,
            "share":   round(w / total * 100, 1),
            "hue":     hue,
            "chroma":  chroma,
            "artists": top_artists,
        })

    result.sort(key=lambda x: -x["share"])
    return result


# ── hours chart ───────────────────────────────────────────────────────────────

def compute_hours_chart(script_dir):
    """
    Reads listening_history.json, counts plays per local hour (0-23).
    Returns list of 24 ints. Falls back to zeros if file not found.
    """
    history_path = os.path.join(script_dir, "listening_history.json")
    if not os.path.exists(history_path):
        return [0] * 24

    with open(history_path, encoding="utf-8") as f:
        history = json.load(f)

    counts = [0] * 24
    for entry in history:
        played_at = entry.get("played_at", "")
        if not played_at:
            continue
        dt_utc = datetime.fromisoformat(played_at.replace("Z", "+00:00"))
        dt_local = dt_utc.astimezone()  # system local timezone
        counts[dt_local.hour] += 1

    return counts


# ── cumulative stats ──────────────────────────────────────────────────────────

CUMULATIVE_FILE = "cumulative_stats.json"

def update_cumulative_stats(all_tracks, all_artists, script_dir):
    """
    Loads cumulative_stats.json, adds any new artist/track IDs from this fetch,
    saves back. Returns updated cumulative counts.
    """
    path = os.path.join(script_dir, CUMULATIVE_FILE)

    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            cum = json.load(f)
        artist_ids = set(cum.get("artist_ids", []))
        track_ids  = set(cum.get("track_ids", []))
    else:
        artist_ids = set()
        track_ids  = set()

    prev_artists = len(artist_ids)
    prev_tracks  = len(track_ids)

    for a in all_artists:
        artist_ids.add(a["id"])
    for t in all_tracks:
        track_ids.add(t["id"])

    new_artists = len(artist_ids) - prev_artists
    new_tracks  = len(track_ids)  - prev_tracks

    with open(path, "w", encoding="utf-8") as f:
        json.dump({
            "artist_ids": sorted(artist_ids),
            "track_ids":  sorted(track_ids),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }, f, indent=2)

    print(f"  ✓ {CUMULATIVE_FILE}  (+{new_artists} artists, +{new_tracks} tracks → {len(artist_ids)} / {len(track_ids)} total)")
    return len(artist_ids), len(track_ids)


# ── JS writers ────────────────────────────────────────────────────────────────

def write_spotify_data(data, path):
    js = "export const SPOTIFY_DATA = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"  ✓ {path}")


def write_venn_data(data, path):
    js = "// Where artists live in time — Venn-style overlap data\nexport const VENN_DATA = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"  ✓ {path}")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    snapshot_path = sys.argv[1] if len(sys.argv) > 1 else latest_snapshot()
    print(f"Reading {snapshot_path}")

    with open(snapshot_path, encoding="utf-8") as f:
        raw = json.load(f)

    # tracks
    short_tracks  = transform_tracks_range(raw["top_tracks"].get("short_term", {}))
    medium_tracks = transform_tracks_range(raw["top_tracks"].get("medium_term", {}))
    long_tracks   = transform_tracks_range(raw["top_tracks"].get("long_term", {}))

    # artists
    short_artists  = transform_artists_range(raw["top_artists"].get("short_term", {}))
    medium_artists = transform_artists_range(raw["top_artists"].get("medium_term", {}))
    long_artists   = transform_artists_range(raw["top_artists"].get("long_term", {}))

    # stats
    stats = compute_stats(
        [short_tracks, medium_tracks, long_tracks],
        [short_artists, medium_artists, long_artists],
        raw.get("fetched_at", ""),
    )

    # profile
    p = raw["profile"]
    profile = {
        "display_name": p.get("display_name", ""),
        "id": p.get("id", ""),
        "country": p.get("country", ""),
        "product": p.get("product", ""),
        "followers": p.get("followers", {}).get("total", 0),
        "url": p.get("external_urls", {}).get("spotify", ""),
    }

    # currently playing
    currently_playing = transform_currently_playing(raw.get("currently_playing"))

    artist_universe = compute_artist_universe(
        short_tracks, medium_tracks, long_tracks,
        short_artists, medium_artists, long_artists,
    )

    spotify_data = {
        "profile": profile,
        "top_tracks": {
            "month": short_tracks,
            "half":  medium_tracks,
            "all":   long_tracks,
        },
        "top_artists": {
            "month": short_artists,
            "half":  medium_artists,
            "all":   long_artists,
        },
        "genres": compute_genre_dna(short_artists, medium_artists, long_artists),
        "artist_universe": artist_universe,
        "currently_playing": currently_playing,
        "stats": stats,
    }

    # venn
    venn_data = compute_venn(short_artists, medium_artists, long_artists)

    # output paths (relative to project root)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    stats["hoursChart"] = compute_hours_chart(script_dir)
    data_dir = os.path.join(script_dir, "frontend", "src", "data")

    # cumulative stats — all unique artists/tracks ever seen across all fetches
    all_tracks_flat  = short_tracks + medium_tracks + long_tracks
    all_artists_flat = short_artists + medium_artists + long_artists
    cum_artists, cum_tracks = update_cumulative_stats(all_tracks_flat, all_artists_flat, script_dir)
    spotify_data["stats"]["cumulativeArtists"] = cum_artists
    spotify_data["stats"]["cumulativeTracks"]  = cum_tracks

    write_spotify_data(spotify_data, os.path.join(data_dir, "spotifyData.js"))
    write_venn_data(venn_data, os.path.join(data_dir, "vennData.js"))
    print("Done.")


if __name__ == "__main__":
    main()
