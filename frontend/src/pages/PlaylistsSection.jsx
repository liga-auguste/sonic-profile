// Playlist Manager — core feature
// Demo mode shows mock data; live mode uses authenticated Spotify API
// owner.id === spotify → Spotify-generated
// owner.id === user_id → own playlist
// anything else        → followed foreign playlist

const MOCK_OWN = [
  { id: "1", name: "Lieblingssongs", tracks: 312, image: null, addedAt: "2019-04-01" },
  { id: "2", name: "Morgen",         tracks: 47,  image: null, addedAt: "2022-08-15" },
  { id: "3", name: "Abend",          tracks: 88,  image: null, addedAt: "2021-03-22" },
  { id: "4", name: "work deep",      tracks: 64,  image: null, addedAt: "2023-01-10" },
  { id: "5", name: "baroque favourites", tracks: 29, image: null, addedAt: "2020-11-05" },
];

const MOCK_NOT_OWN = [
  { id: "6",  name: "Für Liga: Indie Mix",      owner: "spotify",   tracks: 50,  image: null },
  { id: "7",  name: "Für Liga: Chill Hits",     owner: "spotify",   tracks: 50,  image: null },
  { id: "8",  name: "Release Radar",            owner: "spotify",   tracks: 30,  image: null },
  { id: "9",  name: "Discover Weekly",          owner: "spotify",   tracks: 30,  image: null },
  { id: "10", name: "tom misch mix",            owner: "friend",    tracks: 22,  image: null },
  { id: "11", name: "indie coffeeshop vibes",   owner: "stranger",  tracks: 41,  image: null },
  { id: "12", name: "classical study",          owner: "stranger",  tracks: 55,  image: null },
];

function PlaylistRow({ p, action, actionLabel, danger }) {
  return (
    <div className="pm-row">
      <div
        style={{
          width: 48, height: 48, borderRadius: 6, flexShrink: 0,
          background: `oklch(0.24 0.02 280)`,
          border: "1px solid oklch(1 0 0 / 0.07)",
          display: "grid", placeItems: "center",
          fontFamily: "var(--mono)", fontSize: 18,
        }}
      >
        ♪
      </div>
      <div className="pm-text">
        <div className="pm-name">{p.name}</div>
        <div className="pm-sub">
          {p.tracks} tracks
          {p.owner === "spotify" && " · spotify-generated"}
          {p.addedAt && ` · added ${p.addedAt.slice(0, 4)}`}
        </div>
      </div>
      <button className={`pm-action${danger ? " is-danger" : ""}`} onClick={() => action(p)}>
        {actionLabel}
      </button>
    </div>
  );
}

export default function PlaylistsSection({ isDemo = true }) {
  return (
    <section className="section" id="section-playlists">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">06 · playlist manager</div>
          <h1 className="section-title">What's yours, what's Spotify's.</h1>
        </div>
        <div className="section-meta">
          {isDemo ? (
            <>
              <span style={{ color: "var(--accent-2)" }}>demo mode · mock data</span>
              <span className="dot-sep">●</span>
              <span>login for real playlists</span>
            </>
          ) : (
            <>
              <span className="live-dot" style={{ display: "inline-block" }} />
              <span>live · spotify api</span>
            </>
          )}
        </div>
      </div>

      <div className="pm-grid">
        <div>
          <div className="pm-col-head">
            <span className="pm-col-title">📁 Meine Playlists</span>
            <span className="pm-col-count">{MOCK_OWN.length}</span>
          </div>
          <div className="pm-list">
            {MOCK_OWN.map((p) => (
              <PlaylistRow
                key={p.id}
                p={p}
                actionLabel="öffnen →"
                action={() => {}}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="pm-col-head">
            <span className="pm-col-title">📁 Nicht meine</span>
            <span className="pm-col-count">{MOCK_NOT_OWN.length}</span>
          </div>
          <div className="pm-list">
            {MOCK_NOT_OWN.map((p) => (
              <PlaylistRow
                key={p.id}
                p={p}
                actionLabel="entfolgen"
                action={() => {}}
                danger
              />
            ))}
          </div>
        </div>
      </div>

      {isDemo && (
        <div style={{
          marginTop: 28,
          padding: "16px 20px",
          background: "oklch(0.22 0.03 168 / 0.15)",
          border: "1px dashed oklch(0.78 0.16 168 / 0.3)",
          borderRadius: 10,
          fontFamily: "var(--mono)",
          fontSize: 12,
          color: "var(--text-dim)",
          lineHeight: 1.6,
        }}>
          <strong style={{ color: "var(--accent)" }}>Demo-Modus</strong> — das sind Ligaʼs echte Kategorie-Verhältnisse mit Mock-Daten.
          Melde dich mit Spotify an, um deine eigenen Playlists wirklich aufzuräumen.
          Änderungen gehen direkt in deinen Spotify-Account (max. 25 User im Dev Mode).
        </div>
      )}
    </section>
  );
}
