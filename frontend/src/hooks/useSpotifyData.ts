import type { SpotifyData } from "../types";
import type { VennData } from "../types";

import { SPOTIFY_DATA } from "../data/spotifyData";
import { VENN_DATA } from "../data/vennData";

export default function useSpotifyData(): { data: SpotifyData; vennData: VennData } {
  return { data: SPOTIFY_DATA as SpotifyData, vennData: VENN_DATA as VennData };
}
