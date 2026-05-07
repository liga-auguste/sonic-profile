import { useState } from "react";
import Cover from "../components/Cover";
import Waveform from "../components/Waveform";
import RangeToggle from "../components/RangeToggle";
import { hashHue } from "../utils";

function TrackCard({ t, delay = 0 }) {
  const hue = hashHue(t.name + t.artist);
  return (
    <div className="track-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="track-rank">
        <span className="track-rank-num">{String(t.rank).padStart(2, "0")}</span>
      </div>
      <Cover src={t.album_image} alt={t.name} hue={hue} size={88} radius={4} />
      <div className="track-meta">
        <div className="track-name">{t.name}</div>
        <div className="track-artist">{t.artist}</div>
        <div className="track-album">
          {t.album} · {t.release_date?.slice(0, 4)}
        </div>
      </div>
      <div className="track-stats">
        <div className="track-plays">{t.popularity ?? "—"}</div>
        <div className="track-plays-lab">popularity</div>
        <div className="track-mini-wave">
          <Waveform seed={t.rank * 7} bars={28} height={14} color={`oklch(0.7 0.14 ${hue} / 0.6)`} />
        </div>
      </div>
    </div>
  );
}

export default function TracksSection({ data }) {
  const [range, setRange] = useState("month");
  const tracks = data.top_tracks[range];

  return (
    <section className="section" id="section-tracks">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">02 · top tracks</div>
          <h1 className="section-title">The songs on heavy rotation.</h1>
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </div>
      <div className="tracks-grid">
        {tracks.map((t, i) => (
          <TrackCard key={t.id} t={t} delay={i * 30} />
        ))}
      </div>
    </section>
  );
}
