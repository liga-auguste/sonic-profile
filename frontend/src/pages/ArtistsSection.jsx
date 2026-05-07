import { useState } from "react";
import Cover from "../components/Cover";
import RangeToggle from "../components/RangeToggle";
import { fmtNum, hashHue } from "../utils";

function ArtistCard({ a, max, delay = 0 }) {
  const pct = ((a.popularity || 0) / max) * 100;
  const hue = hashHue(a.name);
  return (
    <div className="artist-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="artist-portrait">
        <Cover src={a.image} alt={a.name} hue={hue} size={132} round />
        <div className="artist-rank-badge">#{a.rank}</div>
      </div>
      <div className="artist-name">{a.name}</div>
      <div className="artist-genre">
        {(a.genres && a.genres[0]) || `${fmtNum(a.followers)} followers`}
      </div>
      <div className="artist-bar">
        <div
          className="artist-bar-fill"
          style={{ width: `${pct}%`, background: `oklch(0.65 0.14 ${hue})` }}
        />
      </div>
      <div className="artist-plays">popularity {a.popularity ?? "—"}</div>
    </div>
  );
}

export default function ArtistsSection({ data }) {
  const [range, setRange] = useState("month");
  const artists = data.top_artists[range];
  const max = Math.max(...artists.map((a) => a.popularity || 0), 1);

  return (
    <section className="section" id="section-artists">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">03 · top artists</div>
          <h1 className="section-title">The voices in your head.</h1>
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </div>
      <div className="artists-grid">
        {artists.map((a, i) => (
          <ArtistCard key={a.id} a={a} max={max} delay={i * 30} />
        ))}
      </div>
    </section>
  );
}
