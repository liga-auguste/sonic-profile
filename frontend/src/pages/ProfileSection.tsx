import { useState } from "react";
import Cover from "../components/Cover";
import { fmtNum, hashHue } from "../utils";
import type { SpotifyData, Track } from "../types";

function HoursChart({ hours }: { hours: number[] }) {
  const max = Math.max(...hours, 1);
  const peakHour = hours.indexOf(max);
  const peakLabel = peakHour === 0 ? "12a" : peakHour < 12 ? `${peakHour}a` : peakHour === 12 ? "12p" : `${peakHour - 12}p`;
  return (
    <>
      <div className="hours-peak-label">
        peak: <span>{peakLabel}</span> · {max} plays
      </div>
      <div className="hours-chart">
        {hours.map((h, i) => (
          <div key={i} className="hours-col">
            <div
              className={`hours-bar ${h === max ? "is-peak" : ""}`}
              style={{ height: `${(h / max) * 100}%` }}
              title={`${i}:00 — ${h} plays`}
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

interface ProfileSectionProps {
  data: SpotifyData;
  onTrackSelect: (track: Track | null) => void;
}

export default function ProfileSection({ data, onTrackSelect }: ProfileSectionProps) {
  const { profile, stats, top_tracks } = data;
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleToggle = (t: Track) => {
    const next = activeId === t.id ? null : t.id;
    setActiveId(next);
    onTrackSelect(next ? t : null);
  };

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
                <text x="60" y="74" textAnchor="middle"
                  fontFamily="'Bricolage Grotesque', serif" fontWeight="600"
                  fontSize="48" fill="oklch(0.98 0.02 168)">{initials}</text>
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
            {profile.followers > 0 && (
              <div>
                <div className="ps-num">{fmtNum(profile.followers)}</div>
                <div className="ps-lab">followers</div>
              </div>
            )}
            <div>
              <div className="ps-num">{fmtNum(stats.cumulativeArtists ?? 0)}</div>
              <div className="ps-lab">artists seen</div>
            </div>
            <div>
              <div className="ps-num">{fmtNum(stats.cumulativeTracks ?? 0)}</div>
              <div className="ps-lab">tracks seen</div>
            </div>
          </div>
          <div className="profile-quote">
            "music is just memory with a tempo."
            <div className="profile-quote-by">— {profile.display_name}, bio.txt</div>
          </div>
        </div>

        <div className="recent-card">
          <div className="card-head">
            <div className="card-title">On heavy rotation · last 4 weeks</div>
            <div className="card-meta">short_term top tracks</div>
          </div>
          <div className="recent-list">
            {top_tracks.month.slice(0, 6).map((t) => (
              <div
                key={t.id}
                className={`recent-row${activeId === t.id ? " is-active" : ""}`}
                onClick={() => handleToggle(t)}
              >
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
            <div className="card-title">Tracks played by hour</div>
            <div className="card-meta">{stats.hoursChart.reduce((a, b) => a + b, 0)} plays tracked</div>
          </div>
          <HoursChart hours={stats.hoursChart} />
        </div>
      </div>
    </section>
  );
}
