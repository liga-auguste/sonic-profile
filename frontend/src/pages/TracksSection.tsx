import { useState } from "react";
import Cover from "../components/Cover";
import RangeToggle from "../components/RangeToggle";
import { hashHue } from "../utils";
import type { SpotifyData, Track, RangeKey } from "../types";

function diversify(tracks: Track[]): Track[] {
  const seenAlbums = new Set<string>();
  return tracks.filter((t) => {
    if (seenAlbums.has(t.album)) return false;
    seenAlbums.add(t.album);
    return true;
  });
}

interface TrackRowProps {
  t: Track;
  index: number;
  delay?: number;
  isActive: boolean;
  onToggle: () => void;
}

function TrackRow({ t, index, delay = 0, isActive, onToggle }: TrackRowProps) {
  const hue = hashHue(t.name + t.artist);
  return (
    <div
      className={`track-row${isActive ? " is-active" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`${t.name} by ${t.artist}`}
    >
      <span className="track-row-rank">{String(index).padStart(2, "0")}</span>
      <Cover src={t.album_image} alt={t.name} hue={hue} size={44} radius={4} />
      <div className="track-row-meta">
        <div className="track-row-name">{t.name}</div>
        <div className="track-row-sub">{t.artist} <span className="track-row-album">· {t.album}</span></div>
      </div>
    </div>
  );
}

interface TracksSectionProps {
  data: SpotifyData;
  onTrackSelect: (track: Track | null) => void;
}

export default function TracksSection({ data, onTrackSelect }: TracksSectionProps) {
  const [range, setRange] = useState<RangeKey>("month");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [diverse, setDiverse] = useState(true);

  const raw = data.top_tracks[range];
  const tracks = diverse ? diversify(raw) : raw;
  const visible = showAll ? tracks : tracks.slice(0, 25);

  const handleToggle = (t: Track) => {
    const next = activeId === t.id ? null : t.id;
    setActiveId(next);
    onTrackSelect(next ? t : null);
  };

  const handleRange = (r: RangeKey) => {
    setRange(r);
    setActiveId(null);
    setShowAll(false);
    onTrackSelect(null);
  };

  const skipped = raw.length - tracks.length;

  return (
    <section className="section" id="section-tracks">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">03 · top tracks</div>
          <h1 className="section-title">The songs on heavy rotation.</h1>
        </div>
        <div className="tracks-head-right">
          <button
            className={`diverse-btn${diverse ? " is-on" : ""}`}
            onClick={() => { setDiverse((d) => !d); setShowAll(false); setActiveId(null); onTrackSelect(null); }}
            title="Show one track per album to avoid a single album dominating"
            aria-pressed={diverse}
          >
            {diverse ? "◈ diverse" : "◈ raw"}
          </button>
          <RangeToggle value={range} onChange={handleRange} />
        </div>
      </div>
      {diverse && skipped > 0 && (
        <div className="diverse-note">1 track per album · {skipped} duplicate album tracks filtered</div>
      )}
      <div className="tracks-list">
        {visible.map((t, i) => (
          <TrackRow
            key={t.id}
            t={t}
            index={i + 1}
            delay={i * 18}
            isActive={activeId === t.id}
            onToggle={() => handleToggle(t)}
          />
        ))}
      </div>
      {tracks.length > 25 && (
        <button className="tracks-show-more" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "show top 25" : `show all ${tracks.length}`}
        </button>
      )}
    </section>
  );
}
