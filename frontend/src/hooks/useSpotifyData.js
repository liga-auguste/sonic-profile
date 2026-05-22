import { SPOTIFY_DATA } from "../data/spotifyData";
import { VENN_DATA } from "../data/vennData";

export default function useSpotifyData() {
  return { data: SPOTIFY_DATA, vennData: VENN_DATA };
}
