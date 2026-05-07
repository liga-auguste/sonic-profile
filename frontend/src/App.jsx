import { useState, useEffect, useRef } from "react";
import "./styles.css";

import useAuth from "./hooks/useAuth";
import useSpotifyData from "./hooks/useSpotifyData";

import Sidebar, { NAV } from "./components/Sidebar";
import ProfileSection from "./pages/ProfileSection";
import TracksSection from "./pages/TracksSection";
import ArtistsSection from "./pages/ArtistsSection";
import GenresSection from "./pages/GenresSection";
import StatsSection from "./pages/StatsSection";
import PlaylistsSection from "./pages/PlaylistsSection";

function DemoBanner({ onLogin }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 50,
      background: "oklch(0.21 0.015 280)",
      border: "1px solid oklch(1 0 0 / 0.1)",
      borderRadius: 12,
      padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 8px 32px -8px oklch(0 0 0 / 0.6)",
      fontFamily: "var(--mono)",
      fontSize: 12,
      color: "var(--text-dim)",
      maxWidth: 340,
    }}>
      <div style={{ lineHeight: 1.5 }}>
        <span style={{ color: "var(--accent-2)", fontWeight: 600 }}>Demo-Modus</span>
        {" · "}Ligaʼs echte Daten.<br />
        Mit eigenem Account einloggen?
      </div>
      <button onClick={onLogin} style={{
        background: "oklch(0.78 0.16 168)",
        color: "oklch(0.16 0.02 168)",
        border: "none",
        borderRadius: 8,
        padding: "8px 14px",
        fontFamily: "var(--mono)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.15s",
      }}>
        Login →
      </button>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      height: "100vh", display: "grid", placeItems: "center",
      background: "var(--bg)", fontFamily: "var(--mono)",
      fontSize: 13, color: "var(--text-faint)",
    }}>
      <div style={{ textAlign: "center", lineHeight: 2 }}>
        <div style={{ fontSize: 22, marginBottom: 12 }}>◐</div>
        loading your sonic profile…
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading, isDemo, login, logout } = useAuth();
  const { data, vennData, loading: dataLoading } = useSpotifyData(isDemo);

  const [active, setActive] = useState("profile");
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

  if (authLoading || dataLoading || !data) return <LoadingScreen />;

  return (
    <>
      <div className="app">
        <Sidebar active={active} onNav={onNav} profile={data.profile} />
        <main className="main" ref={scrollerRef}>
          <div className="main-header">
            <div className="crumb">
              <span className="crumb-dim">~ /</span>
              <span>{NAV.find((n) => n.id === active)?.label.toLowerCase()}</span>
            </div>
            <div className="header-right">
              <div className="search">
                <span className="search-glyph">⌕</span>
                <span className="search-placeholder">search artists, tracks, genres</span>
                <span className="search-kbd">⌘K</span>
              </div>
              <div className="header-status">
                {isDemo ? (
                  <span style={{ color: "var(--text-faint)" }}>demo mode</span>
                ) : (
                  <>
                    <span className="live-dot" />
                    <span>live · {data.profile.display_name}</span>
                    <button
                      onClick={logout}
                      style={{
                        fontFamily: "var(--mono)", fontSize: 11,
                        color: "var(--text-faint)", cursor: "pointer",
                        padding: "2px 8px", border: "1px solid var(--line)",
                        borderRadius: 6, background: "none",
                      }}
                    >
                      logout
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <ProfileSection data={data} isDemo={isDemo} />
          <TracksSection data={data} />
          <ArtistsSection data={data} />
          <GenresSection />
          <StatsSection data={data} vennData={vennData} />
          <PlaylistsSection isDemo={isDemo} />

          <footer className="foot">
            <div>my sonic profile · react + recharts · spotify web api · ws live updates</div>
            <div>portfolio piece — {data.profile.display_name}, 2026</div>
          </footer>
        </main>
      </div>

      {isDemo && <DemoBanner onLogin={login} />}
    </>
  );
}
