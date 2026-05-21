"""
genre_resolver.py — Enriches artist genre data using Last.fm as fallback.

Fallback chain:
  1. Spotify genres (from /v1/artists/{id}) — already in the JSON after spotify_fetch.py
  2. Last.fm artist tags (free API, good coverage)
  3. Empty list (unknown)

Usage:
  python genre_resolver.py spotify_data_YYYYMMDD_HHMMSS.json

Requires: LASTFM_API_KEY environment variable
Get a free key at: https://www.last.fm/api/account/create
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from dotenv import load_dotenv

load_dotenv()

LASTFM_API_KEY = os.environ.get("LASTFM_API_KEY", "")
LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/"

# Last.fm tags that map well to real genres (filter out noise like "seen live", "favorites")
NOISE_TAGS = {
    "seen live", "favorites", "favourite", "love", "awesome", "beautiful",
    "all", "good", "best", "great", "amazing", "perfect", "chill",
    "my library", "spotify", "owned", "buy", "wishlist",
}

# How many Last.fm tags to keep per artist
MAX_TAGS = 5


def lastfm_get_tags(artist_name):
    """Fetch top tags for an artist from Last.fm. Returns list of tag strings."""
    params = {
        "method":    "artist.getTopTags",
        "artist":    artist_name,
        "api_key":   LASTFM_API_KEY,
        "format":    "json",
        "autocorrect": "1",
    }
    url = LASTFM_API_URL + "?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "sonic-portfolio/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
        tags = data.get("toptags", {}).get("tag", [])
        result = []
        for tag in tags:
            name = tag.get("name", "").lower().strip()
            count = int(tag.get("count", 0))
            if count < 5:  # skip tags with very few votes
                break
            if name not in NOISE_TAGS and len(name) > 1:
                result.append(name)
            if len(result) >= MAX_TAGS:
                break
        return result
    except Exception as e:
        print(f"     Last.fm error for '{artist_name}': {e}")
        return []


def enrich_genres(data):
    """
    Takes a spotify_fetch output dict and enriches artist genres via Last.fm
    for any artist whose Spotify genres list is empty.
    Returns the modified data dict.
    """
    if not LASTFM_API_KEY:
        print("⚠️  LASTFM_API_KEY not set — skipping genre enrichment.")
        print("   Get a free key at: https://www.last.fm/api/account/create")
        return data

    # Collect all unique artists across all time ranges
    seen_ids = set()
    all_artists = []
    for term_data in data.get("top_artists", {}).values():
        for artist in term_data.get("items", []):
            if artist["id"] not in seen_ids:
                seen_ids.add(artist["id"])
                all_artists.append(artist)

    artists_needing_genres = [a for a in all_artists if not a.get("genres")]
    print(f"\nArtists with Spotify genres:    {len(all_artists) - len(artists_needing_genres)}")
    print(f"Artists needing Last.fm lookup: {len(artists_needing_genres)}\n")

    # Build a lookup dict for quick updates
    genre_lookup = {}  # artist_id → [genres]
    for i, artist in enumerate(artists_needing_genres, 1):
        name = artist["name"]
        print(f"  [{i}/{len(artists_needing_genres)}] {name} ...", end=" ", flush=True)
        tags = lastfm_get_tags(name)
        genre_lookup[artist["id"]] = tags
        if tags:
            print(f"→ {', '.join(tags)}")
        else:
            print("→ (no tags found)")
        time.sleep(0.25)  # respect Last.fm rate limit (5 req/s max)

    # Apply lookups back to all time ranges
    for term_data in data.get("top_artists", {}).values():
        for artist in term_data.get("items", []):
            if not artist.get("genres") and artist["id"] in genre_lookup:
                artist["genres"] = genre_lookup[artist["id"]]

    return data


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python genre_resolver.py spotify_data_YYYYMMDD_HHMMSS.json")
        sys.exit(1)

    input_file = sys.argv[1]
    print(f"Loading {input_file} ...")
    with open(input_file, encoding="utf-8") as f:
        data = json.load(f)

    data = enrich_genres(data)

    # Save back to the same file (in-place enrichment)
    with open(input_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Genres enriched and saved back to {input_file}")

    # Summary
    all_artists = []
    seen = set()
    for term_data in data.get("top_artists", {}).values():
        for a in term_data.get("items", []):
            if a["id"] not in seen:
                seen.add(a["id"])
                all_artists.append(a)

    with_genres = sum(1 for a in all_artists if a.get("genres"))
    print(f"   {with_genres}/{len(all_artists)} artists now have genre data")
