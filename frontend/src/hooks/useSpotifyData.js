import { useState, useEffect } from "react";
import { fetchMe, fetchTopTracks, fetchTopArtists, fetchNowPlaying } from "../api/spotify";
import { SPOTIFY_DATA } from "../data/spotifyData";
import { VENN_DATA } from "../data/vennData";

const TIME_RANGES = [
  { key: "month", spotify: "short_term" },
  { key: "half",  spotify: "medium_term" },
  { key: "all",   spotify: "long_term" },
];

/**
 * When isDemo=true: returns Liga's pre-fetched data immediately.
 * When isDemo=false: fetches live data from the backend.
 */
export default function useSpotifyData(isDemo) {
  const [data, setData]       = useState(isDemo ? SPOTIFY_DATA : null);
  const [vennData]            = useState(VENN_DATA); // always static for now
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (isDemo) {
      setData(SPOTIFY_DATA);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    async function load() {
      try {
        const [profile, nowPlaying, ...rangeResults] = await Promise.all([
          fetchMe(),
          fetchNowPlaying(),
          ...TIME_RANGES.flatMap(({ spotify }) => [
            fetchTopTracks(spotify, 10),
            fetchTopArtists(spotify, 10),
          ]),
        ]);

        // rangeResults layout: [tracks_month, artists_month, tracks_half, artists_half, tracks_all, artists_all]
        const top_tracks  = { month: rangeResults[0], half: rangeResults[2], all: rangeResults[4] };
        const top_artists = { month: rangeResults[1], half: rangeResults[3], all: rangeResults[5] };

        const uniqueArtists = new Set([
          ...top_artists.month, ...top_artists.half, ...top_artists.all,
        ].map((a) => a.id)).size;
        const uniqueTracks = new Set([
          ...top_tracks.month, ...top_tracks.half, ...top_tracks.all,
        ].map((t) => t.id)).size;

        setData({
          profile: {
            display_name: profile.display_name,
            id: profile.id,
            country: profile.country,
            product: profile.product,
            followers: profile.followers?.total ?? 0,
            url: profile.external_urls?.spotify ?? "",
          },
          top_tracks,
          top_artists,
          currently_playing: nowPlaying,
          stats: {
            uniqueArtists,
            uniqueTracks,
            totalMinutes: 0,
            avgPopularity: 0,
            oldestObsession: top_artists.all[0]?.name ?? "—",
            newestRelease: top_tracks.month[0]?.name ?? "—",
            fetched_at: new Date().toISOString(),
          },
        });
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isDemo]);

  return { data, vennData, loading, error };
}
