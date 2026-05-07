import json
import webbrowser
import urllib.parse
import urllib.request
import http.server
import threading
import base64
import os
from datetime import datetime

# ── Credentials ──────────────────────────────────────────────
CLIENT_ID     = os.environ.get("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET", "")
REDIRECT_URI  = os.environ.get("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8000/callback")

SCOPES = " ".join([
    "user-top-read",
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-read-private",
    "user-read-email",
])

# ── Shared state ──────────────────────────────────────────────
auth_code = None

# ── Step 1: Local callback server ────────────────────────────
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


def start_server():
    server = http.server.HTTPServer(("127.0.0.1", 8000), CallbackHandler)
    server.handle_request()  # handle exactly one request then stop


# ── Step 2: Open Spotify auth URL ────────────────────────────
def get_auth_url():
    params = {
        "client_id":     CLIENT_ID,
        "response_type": "code",
        "redirect_uri":  REDIRECT_URI,
        "scope":         SCOPES,
    }
    return "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode(params)


# ── Step 3: Exchange code for token ──────────────────────────
def get_token(code):
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
        return json.loads(resp.read())["access_token"]


# ── Step 4: API helpers ───────────────────────────────────────
def api_get(token, path):
    req = urllib.request.Request(
        f"https://api.spotify.com/v1{path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 204:
            return None   # 204 = No Content (nothing playing)
        raise


# ── Step 5: Fetch all data ────────────────────────────────────
def fetch_all(token):
    print("  → Fetching profile ...")
    profile = api_get(token, "/me")

    print("  → Fetching top tracks (short term) ...")
    top_tracks_short = api_get(token, "/me/top/tracks?limit=50&time_range=short_term")

    print("  → Fetching top tracks (medium term) ...")
    top_tracks_medium = api_get(token, "/me/top/tracks?limit=50&time_range=medium_term")

    print("  → Fetching top tracks (long term) ...")
    top_tracks_long = api_get(token, "/me/top/tracks?limit=50&time_range=long_term")

    print("  → Fetching top artists (short term) ...")
    top_artists_short = api_get(token, "/me/top/artists?limit=50&time_range=short_term")

    print("  → Fetching top artists (medium term) ...")
    top_artists_medium = api_get(token, "/me/top/artists?limit=50&time_range=medium_term")

    print("  → Fetching top artists (long term) ...")
    top_artists_long = api_get(token, "/me/top/artists?limit=50&time_range=long_term")

    print("  → Fetching currently playing ...")
    currently_playing = api_get(token, "/me/player/currently-playing")

    return {
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "profile": profile,
        "top_tracks": {
            "short_term":  top_tracks_short,
            "medium_term": top_tracks_medium,
            "long_term":   top_tracks_long,
        },
        "top_artists": {
            "short_term":  top_artists_short,
            "medium_term": top_artists_medium,
            "long_term":   top_artists_long,
        },
        "currently_playing": currently_playing,
    }


# ── Main ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Starting local callback server ...")
    t = threading.Thread(target=start_server)
    t.start()

    auth_url = get_auth_url()
    print(f"\nOpening Spotify login in your browser ...")
    print(f"(If it doesn't open, go to this URL manually:\n{auth_url}\n)")
    webbrowser.open(auth_url)

    t.join()

    if not auth_code:
        print("ERROR: No auth code received.")
        exit(1)

    print("\nGot auth code! Fetching access token ...")
    token = get_token(auth_code)

    print("\nFetching your Spotify data ...\n")
    data = fetch_all(token)

    filename = f"spotify_data_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Done! Saved to: {filename}")
