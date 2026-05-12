from django.urls import path
from . import views

urlpatterns = [
    # OAuth
    path("auth/login/",    views.spotify_login,    name="spotify-login"),
    path("auth/callback/", views.spotify_callback, name="spotify-callback"),
    path("auth/logout/",   views.spotify_logout,   name="spotify-logout"),
    path("auth/me/",       views.me,               name="me"),

    # Spotify data
    path("top-tracks/",    views.top_tracks,       name="top-tracks"),
    path("top-artists/",   views.top_artists,      name="top-artists"),
    path("now-playing/",    views.now_playing,       name="now-playing"),

    # Playlist manager
    path("playlists/",                          views.playlists,         name="playlists"),
    path("playlists/<str:playlist_id>/unfollow/", views.unfollow_playlist, name="unfollow-playlist"),
    path("playlists/<str:playlist_id>/tracks/",   views.playlist_tracks,   name="playlist-tracks"),
    path("playlists/<str:playlist_id>/tracks/<str:track_uri>/", views.remove_track, name="remove-track"),
]
