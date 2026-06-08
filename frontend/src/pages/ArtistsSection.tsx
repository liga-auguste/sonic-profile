import { useState } from "react";
import Cover from "../components/Cover";
import { hashHue } from "../utils";
import type { SpotifyData, Artist, RangeKey } from "../types";

const RANGES: { key: RangeKey; label: string; sub: string }[] = [
  { key: "month", label: "Last Month",  sub: "4 weeks" },
  { key: "half",  label: "6 Months",    sub: "medium term" },
  { key: "all",   label: "All Time",    sub: "long term" },
];

function ArtistCard({ a, delay = 0 }: { a: Artist; delay?: number }) {
  const hue = hashHue(a.name);
  return (
    <div className="artist-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="artist-portrait">
        <Cover src={a.image} alt={a.name} hue={hue} size={132} round />
        <div className="artist-rank-badge">#{a.rank}</div>
      </div>
      <div className="artist-name">{a.name}</div>
      <div className="artist-genres">
        {(a.genres || []).slice(0, 2).map((g) => (
          <span key={g} className="artist-genre-tag">{g}</span>
        ))}
      </div>
    </div>
  );
}

export default function ArtistsSection({ data }: { data: SpotifyData }) {
  const [range, setRange] = useState<RangeKey>("month");
  const [showAll, setShowAll] = useState(false);

  const artists = data.top_artists[range];
  const visible = showAll ? artists : artists.slice(0, 12);

  return (
    <section className="section" id="section-artists">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">02 · top artists</div>
          <h1 className="section-title">The voices in your head.</h1>
        </div>
        <div className="range-group">
          {RANGES.map((r) => (
            <button
              key={r.key}
              className={`range-btn${range === r.key ? " is-on" : ""}`}
              onClick={() => { setRange(r.key); setShowAll(false); }}
              aria-pressed={range === r.key}
            >
              <span className="range-label">{r.label}</span>
              <span className="range-note">{r.sub}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="artists-grid">
        {visible.map((a, i) => (
          <ArtistCard key={a.id} a={a} delay={i * 25} />
        ))}
      </div>
      {artists.length > 12 && (
        <button className="tracks-show-more" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "show top 12" : `show all ${artists.length}`}
        </button>
      )}
    </section>
  );
}
