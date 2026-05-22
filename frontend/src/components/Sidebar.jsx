const NAV = [
  { id: "genres",  label: "Genre DNA",      glyph: "≋" },
  { id: "artists", label: "Top Artists",    glyph: "◇" },
  { id: "tracks",  label: "Top Tracks",     glyph: "♪" },
  { id: "stats",   label: "Listening Stats", glyph: "▤" },
];

export { NAV };

export default function Sidebar({ active, onNav, profile, fetchedAt }) {
  const initials = (profile?.display_name || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase();

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
          <div className="brand-sub">built May 2026</div>
        </div>
      </div>

      <div className="side-profile">
        <div className="side-avatar">
          {profile?.image ? (
            <img src={profile.image} alt={profile.display_name} className="side-avatar-img" />
          ) : (
            <svg viewBox="0 0 60 60" width="52" height="52">
              <defs>
                <linearGradient id="sag" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="oklch(0.62 0.16 168)" />
                  <stop offset="1" stopColor="oklch(0.42 0.12 320)" />
                </linearGradient>
              </defs>
              <circle cx="30" cy="30" r="30" fill="url(#sag)" />
              <text x="30" y="38" textAnchor="middle"
                fontFamily="'Bricolage Grotesque', serif" fontWeight="600"
                fontSize="24" fill="oklch(0.98 0.02 168)">{initials}</text>
            </svg>
          )}
        </div>
        <div className="side-profile-name">{profile?.display_name ?? "demo"}</div>
        <div className="side-profile-sub">{profile?.country} · {profile?.product}</div>
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
            <span className="side-card-label">data snapshot · daily updated</span>
          </div>
          <div className="side-card-body">
            fetched <span style={{ color: "var(--text)" }}>
              {fetchedAt ? new Date(fetchedAt).toLocaleDateString() : "—"}
            </span>
            <br />
            via spotify api · github actions
          </div>
        </div>
      </div>
    </aside>
  );
}
