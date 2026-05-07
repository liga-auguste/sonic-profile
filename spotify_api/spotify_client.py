"""Thin wrapper around Spotify Web API."""
import requests
from django.conf import settings

SPOTIFY_API = "https://api.spotify.com/v1"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"


def get_auth_url(state: str) -> str:
    params = {
        "client_id": settings.SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
        "scope": settings.SPOTIFY_SCOPES,
        "state": state,
        "show_dialog": "false",
    }
    return requests.Request("GET", SPOTIFY_AUTH_URL, params=params).prepare().url


def exchange_code(code: str) -> dict:
    resp = requests.post(
        SPOTIFY_TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
        },
        auth=(settings.SPOTIFY_CLIENT_ID, settings.SPOTIFY_CLIENT_SECRET),
    )
    resp.raise_for_status()
    return resp.json()


def refresh_token(refresh_tok: str) -> dict:
    resp = requests.post(
        SPOTIFY_TOKEN_URL,
        data={"grant_type": "refresh_token", "refresh_token": refresh_tok},
        auth=(settings.SPOTIFY_CLIENT_ID, settings.SPOTIFY_CLIENT_SECRET),
    )
    resp.raise_for_status()
    return resp.json()


class SpotifyClient:
    def __init__(self, access_token: str):
        self.token = access_token
        self._headers = {"Authorization": f"Bearer {access_token}"}

    def _get(self, path: str, **params) -> dict:
        resp = requests.get(f"{SPOTIFY_API}{path}", headers=self._headers, params=params)
        resp.raise_for_status()
        return resp.json()

    def _delete(self, path: str, json=None):
        resp = requests.delete(f"{SPOTIFY_API}{path}", headers=self._headers, json=json)
        resp.raise_for_status()

    def _put(self, path: str, json=None):
        resp = requests.put(f"{SPOTIFY_API}{path}", headers=self._headers, json=json)
        resp.raise_for_status()

    def me(self) -> dict:
        return self._get("/me")

    def top_tracks(self, time_range: str = "medium_term", limit: int = 10) -> dict:
        return self._get("/me/top/tracks", time_range=time_range, limit=limit)

    def top_artists(self, time_range: str = "medium_term", limit: int = 10) -> dict:
        return self._get("/me/top/artists", time_range=time_range, limit=limit)

    def now_playing(self) -> dict | None:
        resp = requests.get(
            f"{SPOTIFY_API}/me/player/currently-playing",
            headers=self._headers,
        )
        if resp.status_code == 204:
            return None
        resp.raise_for_status()
        return resp.json()

    def playlists(self, limit: int = 50) -> dict:
        return self._get("/me/playlists", limit=limit)

    def playlist_tracks(self, playlist_id: str, limit: int = 50) -> dict:
        return self._get(f"/playlists/{playlist_id}/tracks", limit=limit)

    def unfollow_playlist(self, playlist_id: str):
        self._delete(f"/playlists/{playlist_id}/followers")

    def remove_track(self, playlist_id: str, track_uri: str, snapshot_id: str = None):
        body = {"tracks": [{"uri": track_uri}]}
        if snapshot_id:
            body["snapshot_id"] = snapshot_id
        self._delete(f"/playlists/{playlist_id}/tracks", json=body)
