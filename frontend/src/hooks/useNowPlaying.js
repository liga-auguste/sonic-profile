import { useState, useEffect, useRef } from "react";
import { fetchNowPlaying } from "../api/spotify";

const POLL_INTERVAL = 5000; // ms

/**
 * Polls /api/now-playing/ every 5s and returns the latest data.
 * Falls back to `initial` until the first successful fetch.
 * In demo mode, returns `initial` immediately without polling.
 */
export default function useNowPlaying(initial, isDemo) {
  const [nowPlaying, setNowPlaying] = useState(initial);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isDemo) return;

    async function poll() {
      try {
        const data = await fetchNowPlaying();
        setNowPlaying(data);
      } catch (_) {}
    }

    poll(); // immediate first fetch
    timerRef.current = setInterval(poll, POLL_INTERVAL);

    return () => clearInterval(timerRef.current);
  }, [isDemo]);

  return nowPlaying;
}
