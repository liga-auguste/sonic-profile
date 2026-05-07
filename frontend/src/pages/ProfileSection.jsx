import { useState, useEffect } from "react";
import Cover from "../components/Cover";
import Waveform from "../components/Waveform";
import { fmtMs, fmtNum, hashHue } from "../utils";
import useNowPlaying from "../hooks/useNowPlaying";

const HOURS = [4, 2, 1, 0, 0, 0, 0, 1, 6, 12, 18, 22, 28, 32, 30, 26, 35, 48, 62, 78, 92, 88, 71, 28];

function HoursChart() {
  const max = Math.max(...HOURS);
  return (
    <>
      <div className="hours-chart">
        {HOURS.map((h, i) => (
          <div key={i} className="hours-col">
            <div
              className={`hours-bar ${h === max ? "is-peak" : ""}`}
              style={{ height: `${(h / max) * 100}%` }}
              title={`${i}:00 — ${h} min`}
            />
          </div>
        ))}
      </div>
      <div className="hours-axis">
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>12a</span>
      </div>
    </>
  );
}

function NowPlaying({ cp }) {
  const [pos, setPos] = useState(cp.progress_ms);
  useEffect(() => {
    setPos(cp.progress_ms);
    const id = setInterval(() => {
      setPos((p) => (p + 1000 > cp.duration_ms ? 0 : p + 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [cp]);
  const pct = (pos / cp.duration_ms) * 100;
  const hue = hashHue(cp.name + cp.artist);

  return (
    <div className="now-playing">
      <div className="np-header">
        <div className="np-status">
          <span className="live-dot" />
          <span>{cp.is_playing ? "now playing" : "paused"}</span>
          <span className="np-divider">·</span>
          <span>web playback sdk</span>
        </div>
        <div className="np-context">
          {cp.context_type ? `from ${cp.context_type}` : "queued · 1 of 1"}
        </div>
      </div>

      <div className="np-body">
        <div className="np-art-wrap">
          <Cover src={cp.album_image} alt={cp.name} hue={hue} size={168} radius={4} />
          <div className="np-vinyl-shadow" />
        </div>
        <div className="np-meta">
          <div className="np-track">{cp.name}</div>
          <div className="np-artist">
            {cp.artist} <span className="np-dim">·</span>{" "}
            <span className="np-album">{cp.album}</span>
          </div>
          <div className="np-wave">
            <Waveform seed={11} bars={64} height={22} color={`oklch(0.78 0.15 ${hue} / 0.5)`} />
          </div>
          <div className="np-progress">
            <div className="np-time">{fmtMs(pos)}</div>
            <div className="np-bar">
              <div className="np-bar-fill" style={{ width: `${pct}%` }} />
              <div className="np-bar-head" style={{ left: `${pct}%` }} />
            </div>
            <div className="np-time np-time-r">{fmtMs(cp.duration_ms)}</div>
          </div>
          <div className="np-controls">
            <button className="np-ctl">⤺</button>
            <button className="np-ctl np-ctl-prev">⏮</button>
            <button className="np-ctl np-ctl-play">{cp.is_playing ? "❚❚" : "▶"}</button>
            <button className="np-ctl np-ctl-next">⏭</button>
            <button className="np-ctl">⤻</button>
            <div className="np-controls-spacer" />
            <div className="np-tag">live · synced via websocket</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSection({ data, isDemo }) {
  const { profile, stats, top_tracks, currently_playing } = data;
  const cp = useNowPlaying(currently_playing, isDemo);
  const initials = (profile.display_name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <section className="section" id="section-profile">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">01 · profile</div>
          <h1 className="section-title">A portrait, in plays.</h1>
        </div>
        <div className="section-meta">
          <span>fetched {new Date(stats.fetched_at).toLocaleString()}</span>
          <span className="dot-sep">●</span>
          <span>oauth · scopes 5/5</span>
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <div className="avatar">
            {profile.image ? (
              <img src={profile.image} alt={profile.display_name} className="avatar-img" />
            ) : (
              <svg viewBox="0 0 120 120" width="90" height="90">
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="oklch(0.62 0.16 168)" />
                    <stop offset="1" stopColor="oklch(0.42 0.12 320)" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="60" fill="url(#ag)" />
                <text
                  x="60"
                  y="74"
                  textAnchor="middle"
                  fontFamily="'Bricolage Grotesque', serif"
                  fontWeight="600"
                  fontSize="48"
                  fill="oklch(0.98 0.02 168)"
                >
                  {initials}
                </text>
              </svg>
            )}
            <div className="avatar-ring" />
          </div>
          <div className="profile-name">{profile.display_name}</div>
          <div className="profile-handle">{profile.id.slice(0, 10)}…</div>
          <div className="profile-loc">
            <span>{profile.country}</span>
            <span className="dot-sep">●</span>
            <span>{profile.product} member</span>
          </div>
          <div className="profile-stats">
            <div>
              <div className="ps-num">{fmtNum(profile.followers)}</div>
              <div className="ps-lab">followers</div>
            </div>
            <div>
              <div className="ps-num">{fmtNum(stats.uniqueArtists)}</div>
              <div className="ps-lab">artists</div>
            </div>
            <div>
              <div className="ps-num">{fmtNum(stats.uniqueTracks)}</div>
              <div className="ps-lab">tracks</div>
            </div>
          </div>
          <div className="profile-quote">
            "music is just memory with a tempo."
            <div className="profile-quote-by">— {profile.display_name}, bio.txt</div>
          </div>
        </div>

        {isDemo ? (
          <div className="now-playing now-playing-empty">
            <div className="np-empty-inner">
              <div className="np-empty-icon">♫</div>
              <div className="np-empty-text">log in to see what's playing</div>
            </div>
          </div>
        ) : (
          <NowPlaying cp={cp} />
        )}
      </div>

      <div className="profile-secondary">
        <div className="recent-card">
          <div className="card-head">
            <div className="card-title">On heavy rotation · last 4 weeks</div>
            <div className="card-meta">short_term top tracks</div>
          </div>
          <div className="recent-list">
            {top_tracks.month.slice(0, 6).map((t) => (
              <div key={t.id} className="recent-row">
                <Cover src={t.album_image} alt={t.name} hue={hashHue(t.name)} size={36} radius={3} />
                <div className="recent-text">
                  <div className="recent-track">{t.name}</div>
                  <div className="recent-artist">{t.artist}</div>
                </div>
                <div className="recent-time">#{t.rank}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hours-card">
          <div className="card-head">
            <div className="card-title">Today, by the hour</div>
            <div className="card-meta">minutes listened · synthetic</div>
          </div>
          <HoursChart />
        </div>
      </div>
    </section>
  );
}
