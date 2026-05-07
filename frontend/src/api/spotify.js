import client, { setToken } from "./client";
export { setToken };

// ── Normalizers — shape Spotify API responses to match our component format ──

function normalizeTrack(item, rank) {
  return {
    rank,
    id: item.id,
    name: item.name,
    artists: item.artists.map((a) => a.name),
    artist: item.artists.map((a) => a.name).join(", "),
    album: item.album?.name ?? "",
    album_image: item.album?.images?.[0]?.url ?? null,
    duration_ms: item.duration_ms,
    release_date: item.album?.release_date ?? "",
    popularity: item.popularity,
    url: item.external_urls?.spotify ?? "",
  };
}

function normalizeArtist(item, rank) {
  return {
    rank,
    id: item.id,
    name: item.name,
    image: item.images?.[0]?.url ?? null,
    genres: item.genres ?? [],
    followers: item.followers?.total ?? 0,
    popularity: item.popularity,
    url: item.external_urls?.spotify ?? "",
  };
}

function normalizeNowPlaying(data) {
  if (!data?.is_playing) return { is_playing: false };
  const track = data.item;
  return {
    is_playing: data.is_playing,
    progress_ms: data.progress_ms,
    duration_ms: track.duration_ms,
    name: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    album: track.album?.name ?? "",
    album_image: track.album?.images?.[0]?.url ?? null,
    url: track.external_urls?.spotify ?? "",
    context_type: data.context?.type ?? null,
  };
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function fetchMe() {
  const { data } = await client.get("/api/auth/me/");
  return data;
}

export async function fetchTopTracks(timeRange, limit = 10) {
  const { data } = await client.get("/api/top-tracks/", {
    params: { time_range: timeRange, limit },
  });
  return (data.items ?? []).map((item, i) => normalizeTrack(item, i + 1));
}

export async function fetchTopArtists(timeRange, limit = 10) {
  const { data } = await client.get("/api/top-artists/", {
    params: { time_range: timeRange, limit },
  });
  return (data.items ?? []).map((item, i) => normalizeArtist(item, i + 1));
}

export async function fetchNowPlaying() {
  const { data } = await client.get("/api/now-playing/");
  return normalizeNowPlaying(data);
}

export async function fetchPlaylists() {
  const { data } = await client.get("/api/playlists/");
  return data; // { items, user_id }
}

export async function unfollowPlaylist(playlistId) {
  await client.delete(`/api/playlists/${playlistId}/unfollow/`);
}

export async function fetchPlaylistTracks(playlistId) {
  const { data } = await client.get(`/api/playlists/${playlistId}/tracks/`);
  return data;
}

export async function removeTrack(playlistId, trackUri, snapshotId) {
  await client.delete(`/api/playlists/${playlistId}/tracks/${encodeURIComponent(trackUri)}/`, {
    data: { snapshot_id: snapshotId },
  });
}

export function loginUrl() {
  const base = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
  return `${base}/api/auth/login/`;
}

export async function logout() {
  await client.post("/api/auth/logout/");
}
