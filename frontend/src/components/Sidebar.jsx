const NAV = [
  { id: "profile", label: "Profile", glyph: "◐" },
  { id: "tracks", label: "Top Tracks", glyph: "♪" },
  { id: "artists", label: "Top Artists", glyph: "◇" },
  { id: "genres", label: "Genre DNA", glyph: "≋" },
  { id: "stats", label: "Listening Stats", glyph: "▤" },
  { id: "playlists", label: "Playlists", glyph: "▦" },
];

export { NAV };

export default function Sidebar({ active, onNav, profile }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 32 32" width="28" height="28">
            <circle cx="16" cy="16" r="14" fill="none" stroke="var(--accent)" strokeWidth="1.4" />
            <circle cx="16" cy="16" r="9" fill="none" stroke="var(--accent)" strokeWidth="1.4" opacity="0.6" />
            <circle cx="16" cy="16" r="4" fill="none" stroke="var(--accent)" strokeWidth="1.4" opacity="0.4" />
            <circle cx="16" cy="16" r="1.4" fill="var(--accent)" />
          </svg>
        </div>
        <div className="brand-text">
          <div className="brand-title">My Sonic Profile</div>
          <div className="brand-sub">v0.5 · personal build</div>
        </div>
      </div>

      <nav className="nav">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${active === n.id ? "is-active" : ""}`}
            onClick={() => onNav(n.id)}
          >
            <span className="nav-glyph">{n.glyph}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="side-foot">
        <div className="side-card">
          <div className="side-card-top">
            <span className="live-dot" />
            <span className="side-card-label">socket · live</span>
          </div>
          <div className="side-card-body">
            connected to <span style={{ color: "var(--text)" }}>spotify-ws</span>
            <br />
            42ms · stable
          </div>
        </div>
        <div className="side-meta">
          <div>signed in as</div>
          <div style={{ color: "var(--text)" }}>{profile?.display_name ?? "demo"}</div>
          <div style={{ color: "var(--text-faint)" }}>
            {profile?.country} · {profile?.product}
          </div>
        </div>
      </div>
    </aside>
  );
}
