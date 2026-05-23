export type RangeKey = "month" | "half" | "all";
export type VennKey = "S_only" | "M_only" | "L_only" | "SM" | "SL" | "ML" | "ALL";

export interface Track {
  rank: number;
  id: string;
  name: string;
  artists: string[];
  artist: string;
  album: string;
  album_image: string;
  duration_ms: number;
  explicit: boolean;
  release_date: string;
  url: string;
}

export interface Artist {
  rank: number;
  id: string;
  name: string;
  image: string;
  genres: string[];
  followers: number;
  popularity: number;
  url: string;
}

export interface MergedArtist extends Omit<Artist, "rank"> {
  ranges: Partial<Record<RangeKey, number>>;
}

export interface GenreBucket {
  name: string;
  share: number;
  artists: string[];
  hue: number;
  chroma: number;
}

export interface Profile {
  display_name: string;
  id: string;
  country: string;
  product: string;
  followers: number;
  url: string;
  image?: string;
}

export interface Stats {
  fetched_at: string;
  uniqueArtists: number;
  avgTrackLength: string;
  uniqueTracks: number;
  hoursChart: number[];
  oldestObsession: string;
  releaseYearOldest: number;
  releaseYearNewest: number;
  releaseYearPeak: number;
  longestTrack: string;
  longestTrackName: string;
  explicitCount: number;
  newestRelease: string;
  cumulativeArtists?: number;
  cumulativeTracks?: number;
}

export interface SpotifyData {
  profile: Profile;
  top_tracks: Record<RangeKey, Track[]>;
  top_artists: Record<RangeKey, Artist[]>;
  genres: GenreBucket[];
  artist_universe: Artist[];
  stats: Stats;
}

export interface VennData extends Record<VennKey, string[]> {
  counts: Record<VennKey, number>;
}

export interface ChangelogArtist {
  id: string;
  name: string;
  image: string;
  genres: string[];
}

export interface ChangelogTrack {
  id: string;
  name: string;
  artist: string;
  album_image: string;
}

export interface FetchEntry {
  id: number;
  fetched_at: string;
  new_artists: number;
  new_tracks: number;
  new_plays: number;
  snapshot_file: string;
  artists: ChangelogArtist[];
  tracks: ChangelogTrack[];
}
