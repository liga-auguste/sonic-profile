import secrets
from django.conf import settings
from django.shortcuts import redirect
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import requests as http_requests

from .spotify_client import SpotifyClient, get_auth_url, exchange_code

VALID_TIME_RANGES = {"short_term", "medium_term", "long_term"}


# ── Auth helpers ─────────────────────────────────────────────────────────────

def _get_client(request):
    """Return (SpotifyClient, None) or (None, 401 Response).
    Accepts token via Authorization header (Bearer)."""
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else None
    if not token:
        return None, Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
    return SpotifyClient(token), None


# ── OAuth ─────────────────────────────────────────────────────────────────────

@api_view(["GET"])
def spotify_login(request):
    state = secrets.token_urlsafe(16)
    request.session["oauth_state"] = state
    return redirect(get_auth_url(state))


@api_view(["GET"])
def spotify_callback(request):
    code = request.GET.get("code")
    state = request.GET.get("state")
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")

    if request.GET.get("error") or not code:
        return redirect(f"{frontend_url}/?auth=error")
    if state != request.session.get("oauth_state"):
        return redirect(f"{frontend_url}/?auth=error")

    try:
        tokens = exchange_code(code)
    except Exception:
        return redirect(f"{frontend_url}/?auth=error")

    access_token = tokens["access_token"]
    return redirect(f"{frontend_url}/#token={access_token}")


@api_view(["POST"])
def spotify_logout(request):
    request.session.flush()
    return Response({"ok": True})


@api_view(["GET"])
def me(request):
    client, err = _get_client(request)
    if err:
        return err
    try:
        return Response(client.me())
    except http_requests.HTTPError as e:
        body = {}
        if e.response is not None:
            try:
                body = e.response.json()
            except Exception:
                body = {"raw": e.response.text}
        return Response({"error": str(e), "spotify": body}, status=e.response.status_code if e.response is not None else 500)


# ── Spotify data ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def top_tracks(request):
    client, err = _get_client(request)
    if err:
        return err
    time_range = request.GET.get("time_range", "medium_term")
    if time_range not in VALID_TIME_RANGES:
        return Response({"error": "Invalid time_range"}, status=status.HTTP_400_BAD_REQUEST)
    limit = min(max(1, int(request.GET.get("limit", 10))), 50)
    return Response(client.top_tracks(time_range=time_range, limit=limit))


@api_view(["GET"])
def top_artists(request):
    client, err = _get_client(request)
    if err:
        return err
    time_range = request.GET.get("time_range", "medium_term")
    if time_range not in VALID_TIME_RANGES:
        return Response({"error": "Invalid time_range"}, status=status.HTTP_400_BAD_REQUEST)
    limit = min(max(1, int(request.GET.get("limit", 10))), 50)
    return Response(client.top_artists(time_range=time_range, limit=limit))


@api_view(["GET"])
def now_playing(request):
    client, err = _get_client(request)
    if err:
        return err
    try:
        data = client.now_playing()
    except http_requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 401:
            return Response({"is_playing": False})  # token expired — treat as not playing
        return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)
    if data is None:
        return Response({"is_playing": False})
    return Response(data)




# ── Playlist manager ──────────────────────────────────────────────────────────

@api_view(["GET"])
def playlists(request):
    client, err = _get_client(request)
    if err:
        return err

    user_id = request.session.get("user_id")
    if not user_id:
        user_id = client.me()["id"]
        request.session["user_id"] = user_id

    data = client.playlists()
    items = data.get("items", [])
    for p in items:
        owner_id = p.get("owner", {}).get("id", "")
        if owner_id == user_id:
            p["_category"] = "own"
        elif owner_id == "spotify":
            p["_category"] = "spotify"
        else:
            p["_category"] = "foreign"

    return Response({"items": items, "user_id": user_id})


@api_view(["DELETE"])
def unfollow_playlist(request, playlist_id):
    client, err = _get_client(request)
    if err:
        return err
    client.unfollow_playlist(playlist_id)
    return Response({"ok": True})


@api_view(["GET"])
def playlist_tracks(request, playlist_id):
    client, err = _get_client(request)
    if err:
        return err
    return Response(client.playlist_tracks(playlist_id))


@api_view(["DELETE"])
def remove_track(request, playlist_id, track_uri):
    client, err = _get_client(request)
    if err:
        return err
    snapshot_id = request.data.get("snapshot_id")
    client.remove_track(playlist_id, track_uri, snapshot_id)
    return Response({"ok": True})
