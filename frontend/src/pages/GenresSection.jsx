import { useState, useMemo } from "react";
import VennDiagram from "../components/VennDiagram";


const RANGE_KEYS   = ["month", "half", "all"];
const RANGE_LABELS = ["4w", "6mo", "all-time"];

function buildArtistRanks(topArtists) {
  const map = new Map();
  for (const key of RANGE_KEYS) {
    for (const a of topArtists[key] ?? []) {
      if (!map.has(a.id)) map.set(a.id, { id: a.id, name: a.name, ranks: {} });
      map.get(a.id).ranks[key] = a.rank;
    }
  }
  return [...map.values()];
}

function BumpChart({ topArtists }) {
  const [tip, setTip] = useState(null);
  const artists = useMemo(() => {
    const all = buildArtistRanks(topArtists);
    return all
      .filter((a) => Object.keys(a.ranks).length >= 2)
      .sort((a, b) => Math.min(...Object.values(a.ranks)) - Math.min(...Object.values(b.ranks)))
      .slice(0, 18);
  }, [topArtists]);

  const MAX_RANK = 20;
  const W = 560; const H = 280;
  const COL_X = [150, W / 2, W - 150];
  const rankY = (r) => 24 + (Math.min(r, MAX_RANK) - 1) / (MAX_RANK - 1) * (H - 48);
  const isLong = (a) => !!a.ranks.all;

  return (
    <div className="bump-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="bump-svg">
        {/* column headers */}
        {RANGE_LABELS.map((l, i) => (
          <text key={l} x={COL_X[i]} y={14} textAnchor="middle" className="bump-col-label">{l}</text>
        ))}
        {/* grid lines */}
        {COL_X.map((x, i) => (
          <line key={i} x1={x} y1={22} x2={x} y2={H - 8} stroke="oklch(1 0 0 / 0.07)" strokeWidth="1" />
        ))}
        {/* artist lines + dots */}
        {artists.map((a) => {
          const hue = isLong(a) ? 185 : 340;
          const points = RANGE_KEYS
            .filter((k) => a.ranks[k] != null && a.ranks[k] <= MAX_RANK)
            .map((k, _, arr) => ({ k, x: COL_X[RANGE_KEYS.indexOf(k)], y: rankY(a.ranks[k]) }));
          const isHot = tip === a.id;
          return (
            <g key={a.id} onMouseEnter={() => setTip(a.id)} onMouseLeave={() => setTip(null)}
               style={{ cursor: "default" }}>
              {points.slice(0, -1).map((p, i) => {
                const q = points[i + 1];
                const mx = (p.x + q.x) / 2;
                return (
                  <path key={i}
                    d={`M${p.x},${p.y} C${mx},${p.y} ${mx},${q.y} ${q.x},${q.y}`}
                    fill="none"
                    stroke={`oklch(0.7 0.18 ${hue})`}
                    strokeWidth={isHot ? 2.5 : 1.2}
                    opacity={tip && !isHot ? 0.15 : isHot ? 1 : 0.55}
                  />
                );
              })}
              {points.map((p) => (
                <circle key={p.k} cx={p.x} cy={p.y} r={isHot ? 5 : 3.5}
                  fill={`oklch(0.7 0.18 ${hue})`}
                  opacity={tip && !isHot ? 0.15 : 1}
                />
              ))}
              {isHot && points[0] && (
                <text x={points[0].x - 12} y={points[0].y + 4}
                  textAnchor="end" className="bump-name">{a.name}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="bump-legend">
        <span><span className="bleg-dot" style={{ background: "oklch(0.7 0.18 340)" }} />recent obsession</span>
        <span><span className="bleg-dot" style={{ background: "oklch(0.7 0.18 185)" }} />long-time favorite</span>
        <span className="bump-legend-note">hover to identify · rank 1–20 shown · lines = multi-range artists</span>
      </div>
    </div>
  );
}

function MatrixChart({ topArtists }) {
  const [tip, setTip] = useState(null);
  const artists = useMemo(() => {
    const all = buildArtistRanks(topArtists);
    return all
      .sort((a, b) => {
        const ac = Object.keys(a.ranks).length, bc = Object.keys(b.ranks).length;
        if (ac !== bc) return bc - ac;
        return Math.min(...Object.values(a.ranks)) - Math.min(...Object.values(b.ranks));
      })
      .slice(0, 30);
  }, [topArtists]);

  return (
    <div className="matrix-wrap">
      <div className="matrix-header">
        <div className="matrix-name-col" />
        {RANGE_LABELS.map((l) => (
          <div key={l} className="matrix-range-label">{l}</div>
        ))}
      </div>
      <div className="matrix-rows">
        {artists.map((a) => {
          const isLong = !!a.ranks.all;
          const hue = isLong ? 185 : 340;
          const isHot = tip === a.id;
          return (
            <div key={a.id}
              className={`matrix-row${isHot ? " is-hot" : ""}`}
              onMouseEnter={() => setTip(a.id)}
              onMouseLeave={() => setTip(null)}
            >
              <div className="matrix-name">{a.name}</div>
              {RANGE_KEYS.map((k) => (
                <div key={k} className="matrix-cell">
                  {a.ranks[k] != null ? (
                    <span className="matrix-dot"
                      style={{ background: `oklch(${0.45 + (1 - a.ranks[k] / 50) * 0.3} 0.16 ${hue})` }}>
                      {a.ranks[k]}
                    </span>
                  ) : (
                    <span className="matrix-dot is-absent">—</span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="matrix-footer">
        <span><span className="bleg-dot" style={{ background: "oklch(0.7 0.18 340)" }} />recent</span>
        <span><span className="bleg-dot" style={{ background: "oklch(0.7 0.18 185)" }} />long-time</span>
        <span className="bump-legend-note">brighter = higher rank · — = not in top 50 that period</span>
      </div>
    </div>
  );
}

export default function GenresSection({ data, vennData }) {
  const [hovered, setHovered] = useState(null);
  const [universeView, setUniverseView] = useState("bump");
  const soundDna = data?.genres ?? [];
  const totalShare = soundDna.reduce((s, b) => s + b.share, 0) || 100;
  const artistUniverse = data?.artist_universe ?? [];

  return (
    <section className="section" id="section-genres">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">01 · genre dna</div>
          <h1 className="section-title">A taste, in pigments.</h1>
        </div>
        <div className="section-meta">
          <span>{soundDna.length} genre buckets · computed</span>
          <span className="dot-sep">●</span>
          <span>{soundDna.map((b) => `${b.share}%`).join(" / ")}</span>
        </div>
      </div>

      <div className="genre-grid">
        <div className="genre-strip-card">
          <div className="card-head">
            <div className="card-title">Sound DNA · genres</div>
            <div className="card-meta">% of artists · weighted by rank · Last.fm tags</div>
          </div>
          <div className="genre-strip">
            {soundDna.map((g) => (
              <div
                key={g.name}
                className="genre-stripe"
                style={{
                  width:      `${(g.share / totalShare) * 100}%`,
                  background: `oklch(${g.chroma < 0.05 ? 0.82 : 0.6} ${g.chroma ?? 0.15} ${g.hue})`,
                  opacity:    hovered && hovered !== g.name ? 0.35 : 1,
                }}
                onMouseEnter={() => setHovered(g.name)}
                onMouseLeave={() => setHovered(null)}
                title={`${g.name} — ${g.share}%`}
              />
            ))}
          </div>
          <div className="genre-bars">
            {soundDna.map((g) => (
              <div
                key={g.name}
                className={`genre-row ${hovered === g.name ? "is-hot" : ""}`}
                onMouseEnter={() => setHovered(g.name)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="genre-row-name">
                  <span className="genre-swatch" style={{ background: `oklch(${g.chroma < 0.05 ? 0.88 : 0.65} ${g.chroma ?? 0.15} ${g.hue})` }} />
                  <span>{g.name}</span>
                </div>
                <div className="genre-row-bar">
                  <div
                    className="genre-row-fill"
                    style={{
                      width:      `${(g.share / soundDna[0].share) * 100}%`,
                      background: `oklch(${g.chroma < 0.05 ? 0.85 : 0.6} ${g.chroma ?? 0.14} ${g.hue})`,
                    }}
                  />
                </div>
                <div className="genre-row-num">{g.share.toFixed(1)}%</div>
                <div className="genre-row-tracks">{g.artists.length} artists</div>
              </div>
            ))}
          </div>
          <div className="genre-foot">
            <div className="genre-foot-label">representative artists in highlighted bucket</div>
            <div className="genre-foot-list">
              {(
                hovered
                  ? soundDna.find((d) => d.name === hovered)?.artists
                  : soundDna[0]?.artists
              )?.join(" · ") || "—"}
            </div>
          </div>
        </div>

        <div className="genre-bubble-card">
          <div className="card-head">
            <div className="card-title">Artist universe</div>
            <div className="universe-tabs">
              {["bump", "venn", "matrix"].map((v) => (
                <button key={v} className={`universe-tab${universeView === v ? " is-active" : ""}`}
                  onClick={() => setUniverseView(v)}>{v}</button>
              ))}
            </div>
          </div>
          {universeView === "bump"    && <BumpChart topArtists={data.top_artists} />}
          {universeView === "venn"    && <VennDiagram vennData={vennData} />}
          {universeView === "matrix"  && <MatrixChart topArtists={data.top_artists} />}
        </div>
      </div>
    </section>
  );
}
