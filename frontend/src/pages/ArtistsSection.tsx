import { useState } from "react";
import Cover from "../components/Cover";
import { hashHue } from "../utils";
import type { SpotifyData, Artist, MergedArtist, RangeKey } from "../types";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "month", label: "4w" },
  { key: "half",  label: "6mo" },
  { key: "all",   label: "all" },
];

function buildMergedArtists(topArtists: SpotifyData["top_artists"]): MergedArtist[] {
  const map = new Map<string, MergedArtist>();

  for (const { key } of RANGES) {
    for (const a of topArtists[key]) {
      if (!map.has(a.id)) {
        map.set(a.id, { ...a, ranges: {} });
      }
      map.get(a.id)!.ranges[key] = a.rank;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const ac = Object.keys(a.ranges).length;
    const bc = Object.keys(b.ranges).length;
    if (ac !== bc) return bc - ac;
    return Math.min(...Object.values(a.ranges) as number[]) - Math.min(...Object.values(b.ranges) as number[]);
  });
}

function RangePills({ ranges }: { ranges: MergedArtist["ranges"] }) {
  return (
    <div className="artist-ranges">
      {RANGES.map(({ key, label }) =>
        ranges[key] ? (
          <span key={key} className="artist-range-pill is-present">
            {label} <span className="artist-range-rank">#{ranges[key]}</span>
          </span>
        ) : (
          <span key={key} className="artist-range-pill is-absent">{label}</span>
        )
      )}
    </div>
  );
}

function ArtistCard({ a, delay = 0 }: { a: MergedArtist; delay?: number }) {
  const hue = hashHue(a.name);
  const rangeCount = Object.keys(a.ranges).length;
  return (
    <div
      className={`artist-card${rangeCount === 3 ? " is-fixture" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="artist-portrait">
        <Cover src={a.image} alt={a.name} hue={hue} size={132} round />
        <div className="artist-rank-badge">#{Math.min(...Object.values(a.ranges) as number[])}</div>
      </div>
      <div className="artist-name">{a.name}</div>
      <div className="artist-genres">
        {(a.genres || []).slice(0, 2).map((g) => (
          <span key={g} className="artist-genre-tag">{g}</span>
        ))}
      </div>
      <RangePills ranges={a.ranges} />
    </div>
  );
}

export default function ArtistsSection({ data }: { data: SpotifyData }) {
  const [showAll, setShowAll] = useState(false);
  const artists = buildMergedArtists(data.top_artists);
  const visible = showAll ? artists : artists.slice(0, 10);

  const counts: Record<number, number> = { 3: 0, 2: 0, 1: 0 };
  for (const a of artists) counts[Object.keys(a.ranges).length]++;

  return (
    <section className="section" id="section-artists">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">02 · top artists</div>
          <h1 className="section-title">The voices in your head.</h1>
        </div>
        <div className="artists-legend">
          <span className="legend-item"><span className="legend-dot is-3" />all 3 ranges <em>{counts[3]}</em></span>
          <span className="legend-item"><span className="legend-dot is-2" />2 ranges <em>{counts[2]}</em></span>
          <span className="legend-item"><span className="legend-dot is-1" />1 range <em>{counts[1]}</em></span>
        </div>
      </div>
      <div className="artists-grid">
        {visible.map((a, i) => (
          <ArtistCard key={a.id} a={a} delay={i * 25} />
        ))}
      </div>
      {artists.length > 10 && (
        <button className="tracks-show-more" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "show top 10" : `show all ${artists.length}`}
        </button>
      )}
    </section>
  );
}
