import json
import webbrowser
import urllib.parse
import urllib.request
import http.server
import threading
import base64
import os
import sys
import time
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# ── Credentials ──────────────────────────────────────────────
CLIENT_ID     = os.environ.get("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET", "")
# Uses a dedicated port (9009) so it doesn't conflict with the running Django backend (8000)
REDIRECT_URI  = os.environ.get("SPOTIFY_FETCH_REDIRECT_URI", "http://127.0.0.1:9009/callback")

SCOPES = " ".join([
    "user-top-read",
    "user-read-recently-played",
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-read-private",
    "user-read-email",
])

# Tracks longer than this are likely audiobook chapters
MAX_TRACK_DURATION_MS = 30 * 60 * 1000  # 30 minutes

# ── Shared state ──────────────────────────────────────────────
auth_code = None


# ── Callback server (interactive OAuth) ──────────────────────
class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        if "code" in params:
            auth_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h2>Done! You can close this tab.</h2>")
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"<h2>Error: no code received.</h2>")

    def log_message(self, *args):
        pass  # silence server logs


CALLBACK_PORT = 9009

def start_server():
    server = http.server.HTTPServer(("127.0.0.1", CALLBACK_PORT), CallbackHandler)
    server.handle_request()


# ── Auth helpers ──────────────────────────────────────────────
def get_auth_url():
    params = {
        "client_id":     CLIENT_ID,
        "response_type": "code",
        "redirect_uri":  REDIRECT_URI,
        "scope":         SCOPES,
    }
    return "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode(params)


def exchange_code(code):
    """Exchange auth code for access + refresh tokens."""
    credentials = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
    data = urllib.parse.urlencode({
        "grant_type":   "authorization_code",
        "code":         code,
        "redirect_uri": REDIRECT_URI,
    }).encode()
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=data,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type":  "application/x-www-form-urlencoded",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())  # {access_token, refresh_token, expires_in, ...}


def refresh_access_token(refresh_token):
    """Get a fresh access token using a saved refresh token (no browser needed)."""
    credentials = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
    data = urllib.parse.urlencode({
        "grant_type":    "refresh_token",
        "refresh_token": refresh_token,
    }).encode()
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=data,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type":  "application/x-www-form-urlencoded",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["access_token"]


# ── Spotify API helper ────────────────────────────────────────
def api_get(token, path):
    req = urllib.request.Request(
        f"https://api.spotify.com/v1{path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read()
            if not body:
                return None  # empty body (Spotify quirk for currently-playing)
            return json.loads(body)
    except urllib.error.HTTPError as e:
        if e.code == 204:
            return None  # 204 No Content = nothing playing
        raise


# ── Podcast / Audiobook filter ────────────────────────────────
def is_music_track(item):
    """Return True only for real music tracks — filters out podcasts and audiobooks."""
    if item is None:
        return False
    # Podcast episodes have type "episode", not "track"
    if item.get("type") != "track":
        return False
    # Spotify labels audiobooks explicitly in album_type
    if item.get("album", {}).get("album_type") == "audiobook":
        return False
    # Audiobook chapters are typically very long (chapters > 30 min)
    if item.get("duration_ms", 0) > MAX_TRACK_DURATION_MS:
        return False
    return True


# ── Artist details (batch, for genres/followers/popularity) ──
def fetch_artist_details(token, artist_ids):
    """
    Fetch full artist objects (genres, followers, popularity).
    Tries batch endpoint first (50 IDs per request), falls back to individual fetches on error.
    """
    details = {}
    # Only keep valid-looking Spotify IDs (22-char base62)
    ids = [i for i in artist_ids if i and len(i) <= 22]

    for i in range(0, len(ids), 50):
        batch = ids[i : i + 50]
        try:
            ids_param = urllib.parse.quote(",".join(batch), safe=",")
            result = api_get(token, f"/artists?ids={ids_param}")
            for artist in (result or {}).get("artists", []):
                if artist:
                    details[artist["id"]] = artist
        except urllib.error.HTTPError as e:
            print(f"     Batch fetch failed ({e.code}) — falling back to individual requests ...")
            for artist_id in batch:
                try:
                    artist = api_get(token, f"/artists/{artist_id}")
                    if artist:
                        details[artist["id"]] = artist
                except Exception as ex:
                    print(f"     Skipping {artist_id}: {ex}")
                time.sleep(0.12)
        if i + 50 < len(ids):
            time.sleep(0.15)

    return details


# ── Fetch everything ──────────────────────────────────────────
def fetch_all(token):
    print("  → Fetching profile ...")
    profile = api_get(token, "/me")

    # ── Top tracks (3 time ranges, filtered) ──
    top_tracks = {}
    for term in ("short_term", "medium_term", "long_term"):
        print(f"  → Fetching top tracks ({term}) ...")
        result = api_get(token, f"/me/top/tracks?limit=50&time_range={term}")
        raw_items = result.get("items", []) if result else []
        filtered  = [t for t in raw_items if is_music_track(t)]
        skipped   = len(raw_items) - len(filtered)
        if skipped:
            print(f"     (filtered {skipped} non-music items)")
        top_tracks[term] = {"items": filtered}

    # ── Top artists (3 time ranges) ──
    top_artists_raw = {}
    all_artist_ids  = set()
    for term in ("short_term", "medium_term", "long_term"):
        print(f"  → Fetching top artists ({term}) ...")
        result = api_get(token, f"/me/top/artists?limit=50&time_range={term}")
        items  = result.get("items", []) if result else []
        top_artists_raw[term] = items
        for a in items:
            all_artist_ids.add(a["id"])

    # ── Full artist details (genres, followers, popularity) ──
    print(f"  → Fetching full details for {len(all_artist_ids)} unique artists ...")
    artist_details = fetch_artist_details(token, all_artist_ids)

    # Merge enriched details back into each time-range list
    top_artists = {}
    for term, items in top_artists_raw.items():
        enriched = [artist_details.get(a["id"], a) for a in items]
        top_artists[term] = {"items": enriched}

    # ── Recently played (with timestamps, filtered) ──
    print("  → Fetching recently played ...")
    recently_raw   = api_get(token, "/me/player/recently-played?limit=50")
    recently_items = []
    for entry in (recently_raw or {}).get("items", []):
        track = entry.get("track")
        if is_music_track(track):
            recently_items.append({
                "played_at": entry["played_at"],
                "track":     track,
            })
    skipped_rp = len((recently_raw or {}).get("items", [])) - len(recently_items)
    if skipped_rp:
        print(f"     (filtered {skipped_rp} non-music items from recently played)")

    # ── Currently playing ──
    print("  → Fetching currently playing ...")
    currently_playing = api_get(token, "/me/player/currently-playing")

    return {
        "fetched_at":        datetime.now(timezone.utc).isoformat(),
        "profile":           profile,
        "top_tracks":        top_tracks,
        "top_artists":       top_artists,
        "recently_played":   recently_items,
        "currently_playing": currently_playing,
    }


# ── Listening history (akkumulierend) ────────────────────────
HISTORY_FILE = "listening_history.json"

def update_listening_history(new_items):
    """
    Appends new recently-played entries to listening_history.json.
    Deduplicates by played_at timestamp — safe to run multiple times per day.
    Returns (total_entries, new_entries_added).
    """
    # Load existing history
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, encoding="utf-8") as f:
            history = json.load(f)
    else:
        history = []

    existing_timestamps = {entry["played_at"] for entry in history}

    added = 0
    for item in new_items:
        if item["played_at"] not in existing_timestamps:
            history.append(item)
            existing_timestamps.add(item["played_at"])
            added += 1

    # Sort by played_at descending (newest first)
    history.sort(key=lambda x: x["played_at"], reverse=True)

    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

    return len(history), added


# ── Main ──────────────────────────────────────────────────────
if __name__ == "__main__":
    refresh_token_env = os.environ.get("SPOTIFY_REFRESH_TOKEN", "")

    if refresh_token_env:
        # CI / cron mode: use saved refresh token, no browser needed
        print("Using SPOTIFY_REFRESH_TOKEN from environment ...")
        token = refresh_access_token(refresh_token_env)
    else:
        # Interactive mode: full browser OAuth flow
        print("Starting local callback server on 127.0.0.1:8000 ...")
        t = threading.Thread(target=start_server)
        t.start()

        auth_url = get_auth_url()
        print(f"\nOpening Spotify login in your browser ...")
        print(f"(If it doesn't open, visit:\n  {auth_url}\n)")
        webbrowser.open(auth_url)
        t.join()

        if not auth_code:
            print("ERROR: No auth code received.")
            sys.exit(1)

        print("\nGot auth code — fetching tokens ...")
        tokens = exchange_code(auth_code)
        token  = tokens["access_token"]

        if "refresh_token" in tokens:
            print("\n" + "─" * 60)
            print("✅ Save this as SPOTIFY_REFRESH_TOKEN (GitHub Secret):")
            print(f"   {tokens['refresh_token']}")
            print("─" * 60 + "\n")

    print("\nFetching your Spotify data ...\n")
    data = fetch_all(token)

    filename = f"spotify_data_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # ── Akkumulierende Hörhistorie ──
    total, added = update_listening_history(data["recently_played"])

    print(f"\n✅ Done! Saved to: {filename}")
    print(f"   Tracks (short):   {len(data['top_tracks']['short_term']['items'])}")
    print(f"   Tracks (medium):  {len(data['top_tracks']['medium_term']['items'])}")
    print(f"   Tracks (long):    {len(data['top_tracks']['long_term']['items'])}")
    print(f"   Artists (unique): {len(set(a['id'] for t in data['top_artists'].values() for a in t['items']))}")
    print(f"   Recently played:  {len(data['recently_played'])} tracks fetched")
    print(f"   Listening history: +{added} new → {total} total entries in {HISTORY_FILE}")
