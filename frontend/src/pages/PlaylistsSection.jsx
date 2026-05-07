import { useState, useEffect } from "react";
import { fetchPlaylists, unfollowPlaylist } from "../api/spotify";
import Cover from "../components/Cover";
import { hashHue } from "../utils";

const MOCK_OWN = [
  { id: "1", name: "Lieblingssongs",      tracks: 312, image: null, addedAt: "2019-04-01" },
  { id: "2", name: "Morgen",              tracks: 47,  image: null, addedAt: "2022-08-15" },
  { id: "3", name: "Abend",              tracks: 88,  image: null, addedAt: "2021-03-22" },
  { id: "4", name: "work deep",          tracks: 64,  image: null, addedAt: "2023-01-10" },
  { id: "5", name: "baroque favourites", tracks: 29,  image: null, addedAt: "2020-11-05" },
];

const MOCK_NOT_OWN = [
  { id: "6",  name: "Für Liga: Indie Mix",    _category: "spotify", tracks: 50, image: null },
  { id: "7",  name: "Für Liga: Chill Hits",   _category: "spotify", tracks: 50, image: null },
  { id: "8",  name: "Release Radar",          _category: "spotify", tracks: 30, image: null },
  { id: "9",  name: "Discover Weekly",        _category: "spotify", tracks: 30, image: null },
  { id: "10", name: "tom misch mix",          _category: "foreign", tracks: 22, image: null },
  { id: "11", name: "indie coffeeshop vibes", _category: "foreign", tracks: 41, image: null },
  { id: "12", name: "classical study",        _category: "foreign", tracks: 55, image: null },
];

function PlaylistRow({ p, action, actionLabel, danger, disabled }) {
  return (
    <div className="pm-row">
      <Cover
        src={p.image}
        alt={p.name}
        hue={hashHue(p.name)}
        size={48}
        radius={6}
      />
      <div className="pm-text">
        <div className="pm-name">{p.name}</div>
        <div className="pm-sub">
          {p.tracks} tracks
          {p._category === "spotify" && " · spotify-generated"}
          {p.addedAt && ` · added ${p.addedAt.slice(0, 4)}`}
        </div>
      </div>
      {action && (
        <button
          className={`pm-action${danger ? " is-danger" : ""}`}
          onClick={() => action(p)}
          disabled={disabled}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function normalize(items) {
  return items.map((p) => ({
    id: p.id,
    name: p.name,
    tracks: p.items?.total ?? 0,
    image: p.images?.[0]?.url ?? null,
    _category: p._category,
    owner: p.owner?.display_name ?? "",
  }));
}

export default function PlaylistsSection({ isDemo = true }) {
  const [own, setOwn]         = useState(isDemo ? MOCK_OWN : null);
  const [notOwn, setNotOwn]   = useState(isDemo ? MOCK_NOT_OWN : null);
  const [loading, setLoading] = useState(!isDemo);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (isDemo) return;

    fetchPlaylists()
      .then(({ items }) => {
        const all = normalize(items);
        setOwn(all.filter((p) => p._category === "own"));
        setNotOwn(all.filter((p) => p._category !== "own"));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isDemo]);

  const handleUnfollow = async (p) => {
    if (!confirm(`Unfollow "${p.name}"?`)) return;
    setRemoving(p.id);
    try {
      await unfollowPlaylist(p.id);
      setNotOwn((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      alert("Failed to unfollow playlist.");
    } finally {
      setRemoving(null);
    }
  };

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

      {loading ? (
        <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text-faint)", padding: "40px 0" }}>
          loading playlists…
        </div>
      ) : (
        <div className="pm-grid">
          <div>
            <div className="pm-col-head">
              <span className="pm-col-title">📁 My playlists</span>
              <span className="pm-col-count">{own?.length ?? 0}</span>
            </div>
            <div className="pm-list">
              {own?.map((p) => (
                <PlaylistRow key={p.id} p={p} actionLabel="open →" action={() => window.open(`https://open.spotify.com/playlist/${p.id}`, "_blank")} />
              ))}
            </div>
          </div>

          <div>
            <div className="pm-col-head">
              <span className="pm-col-title">📁 Not mine</span>
              <span className="pm-col-count">{notOwn?.length ?? 0}</span>
            </div>
            <div className="pm-list">
              {notOwn?.map((p) => (
                <PlaylistRow
                  key={p.id}
                  p={p}
                  actionLabel={removing === p.id ? "…" : "unfollow"}
                  action={isDemo ? null : handleUnfollow}
                  danger
                  disabled={removing === p.id}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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
          <strong style={{ color: "var(--accent)" }}>Demo mode</strong> — mock data showing Liga's real category ratios.
          Log in with Spotify to manage your own playlists.
          Changes go directly to your Spotify account.
        </div>
      )}
    </section>
  );
}
