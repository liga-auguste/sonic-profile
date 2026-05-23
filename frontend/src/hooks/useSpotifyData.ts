import type { SpotifyData } from "../types";
import type { VennData } from "../types";

// @ts-expect-error generated JS file, no type declarations
import { SPOTIFY_DATA } from "../data/spotifyData";
// @ts-expect-error generated JS file, no type declarations
import { VENN_DATA } from "../data/vennData";

export default function useSpotifyData(): { data: SpotifyData; vennData: VennData } {
  return { data: SPOTIFY_DATA as SpotifyData, vennData: VENN_DATA as VennData };
}
