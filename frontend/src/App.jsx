import { useState, useEffect, useRef } from "react";
import "./styles.css";

import useSpotifyData from "./hooks/useSpotifyData";

import Sidebar, { NAV } from "./components/Sidebar";
import TracksSection from "./pages/TracksSection";
import ArtistsSection from "./pages/ArtistsSection";
import GenresSection from "./pages/GenresSection";
import StatsSection from "./pages/StatsSection";

export default function App() {
  const { data, vennData } = useSpotifyData();
  const [active, setActive] = useState("genres");
  const [activeTrack, setActiveTrack] = useState(null);
  const scrollerRef = useRef(null);

  const onNav = (id) => {
    setActive(id);
    const el = document.getElementById(`section-${id}`);
    if (el && scrollerRef.current) {
      scrollerRef.current.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const ids = NAV.map((n) => `section-${n.id}`);
    const onScroll = () => {
      const sc = scrollerRef.current;
      if (!sc) return;
      const top = sc.scrollTop + 120;
let cur = active;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= top) cur = id.replace("section-", "");
      }
      if (cur !== active) setActive(cur);
    };
    const sc = scrollerRef.current;
    if (sc) sc.addEventListener("scroll", onScroll);
    return () => sc && sc.removeEventListener("scroll", onScroll);
  }, [active]);

  return (
    <div className={`app${activeTrack ? " has-player" : ""}`}>
      <Sidebar active={active} onNav={onNav} profile={data.profile} fetchedAt={data.stats.fetched_at} />
      <main className="main" ref={scrollerRef}>
        <div className="main-header">
          <div className="crumb">
            <span className="crumb-dim">~ /</span>
            <span>{NAV.find((n) => n.id === active)?.label.toLowerCase()}</span>
          </div>
        </div>

        <GenresSection data={data} vennData={vennData} />
        <ArtistsSection data={data} />
        <TracksSection data={data} onTrackSelect={setActiveTrack} />
        <StatsSection data={data} vennData={vennData} />

        <footer className="foot">
          <div>portfolio piece — {data.profile.display_name}, 2026</div>
        </footer>
      </main>
      {activeTrack && (
        <iframe
          className="bottom-player"
          src={`https://open.spotify.com/embed/track/${activeTrack.id}?utm_source=generator&theme=0`}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}
    </div>
  );
}
