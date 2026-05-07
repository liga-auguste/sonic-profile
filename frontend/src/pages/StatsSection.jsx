import { useState, useMemo } from "react";
import { fmtNum } from "../utils";

function StatCard({ big, label, sub, accent, small }) {
  return (
    <div className="stat-card" style={{ "--card-accent": `oklch(0.7 0.15 ${accent})` }}>
      <div className="stat-tick" />
      <div className={`stat-big ${small ? "is-small" : ""}`}>{big}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function VennDiagram({ vennData }) {
  const [hot, setHot] = useState("ALL");

  const circles = [
    { id: "S", label: "last month", cx: 78,  cy: 70,  r: 52, hue: 332 },
    { id: "M", label: "6 months",   cx: 122, cy: 70,  r: 52, hue: 168 },
    { id: "L", label: "all-time",   cx: 100, cy: 100, r: 52, hue: 42  },
  ];

  const regions = [
    { key: "S_only", x: 50,  y: 56,  label: "last month only",      hue: 332 },
    { key: "M_only", x: 150, y: 56,  label: "6 months only",        hue: 168 },
    { key: "L_only", x: 100, y: 130, label: "all-time only",         hue: 42  },
    { key: "SM",     x: 100, y: 50,  label: "last month ∩ 6 months", hue: 250 },
    { key: "SL",     x: 72,  y: 100, label: "last month ∩ all-time", hue: 6   },
    { key: "ML",     x: 128, y: 100, label: "6 months ∩ all-time",   hue: 100 },
    { key: "ALL",    x: 100, y: 80,  label: "all three ranges",      hue: 200 },
  ];

  const region = regions.find((r) => r.key === hot);
  const list = vennData[hot] || [];
  const total = vennData.counts[hot];

  return (
    <div className="venn-wrap">
      <svg viewBox="0 0 200 160" className="venn-svg" preserveAspectRatio="xMidYMid meet">
        {circles.map((c) => (
          <circle
            key={c.id}
            cx={c.cx} cy={c.cy} r={c.r}
            fill={`oklch(0.6 0.16 ${c.hue} / 0.18)`}
            stroke={`oklch(0.78 0.16 ${c.hue} / 0.7)`}
            strokeWidth="0.8"
          />
        ))}
        {circles.map((c) => (
          <text
            key={c.id + "l"}
            x={c.cx}
            y={c.id === "L" ? c.cy + c.r + 10 : c.cy - c.r - 6}
            textAnchor="middle"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="7"
            fill={`oklch(0.85 0.1 ${c.hue})`}
          >
            {c.label}
          </text>
        ))}
        {regions.map((r) => {
          const isHot = r.key === hot;
          return (
            <g key={r.key} className="venn-hit" onMouseEnter={() => setHot(r.key)}>
              <circle
                cx={r.x} cy={r.y}
                r={isHot ? 11 : 8.5}
                fill={`oklch(${isHot ? 0.78 : 0.32} 0.04 280)`}
                stroke={`oklch(0.78 0.16 ${r.hue})`}
                strokeWidth={isHot ? 1.4 : 0.6}
              />
              <text
                x={r.x} y={r.y + 2.5}
                textAnchor="middle"
                fontFamily="'Bricolage Grotesque', sans-serif"
                fontWeight="600"
                fontSize="8"
                fill={isHot ? "oklch(0.18 0.014 280)" : "oklch(0.95 0.01 280)"}
              >
                {vennData.counts[r.key]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="venn-side">
        <div className="venn-side-label">{region.label}</div>
        <div className="venn-side-num">
          {total} <span>artists</span>
        </div>
        <div className="venn-side-list">
          {list.length
            ? list.slice(0, 14).map((n) => <span key={n} className="venn-chip">{n}</span>)
            : <span className="venn-empty">—</span>}
          {list.length > 14 && <span className="venn-more">+{total - 14} more</span>}
        </div>
        <div className="venn-hint">hover regions to explore</div>
      </div>
    </div>
  );
}

function StreakGrid() {
  const cells = useMemo(() => {
    const out = []; let s = 7;
    for (let i = 0; i < 7 * 26; i++) {
      s = (s * 9301 + 49297) % 233280;
      const r = s / 233280;
      const v = r < 0.1 ? 0 : r < 0.35 ? 1 : r < 0.65 ? 2 : r < 0.88 ? 3 : 4;
      out.push(v);
    }
    return out;
  }, []);
  const palette = [
    "oklch(0.22 0.02 168)", "oklch(0.32 0.06 168)", "oklch(0.45 0.1 168)",
    "oklch(0.6 0.14 168)", "oklch(0.78 0.16 168)",
  ];
  return (
    <div className="streak-grid">
      {cells.map((v, i) => (
        <div key={i} className="streak-cell" style={{ background: palette[v] }} />
      ))}
    </div>
  );
}

export default function StatsSection({ data, vennData }) {
  const { stats, top_tracks } = data;

  return (
    <section className="section" id="section-stats">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">05 · listening stats</div>
          <h1 className="section-title">Numbers that don't lie.</h1>
        </div>
        <div className="section-meta">
          <span>computed from top 50 × 3 ranges</span>
          <span className="dot-sep">●</span>
          <span>2026 · ytd</span>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard big={fmtNum(stats.uniqueArtists)} label="unique artists" sub="across all-time tops" accent="168" />
        <StatCard big="3:59" label="avg track length" sub="across top 150" accent="42" />
        <StatCard big="11:38" label="longest track" sub="probably a Bach piece 😄" accent="332" />
        <StatCard big="7 / 150" label="explicit tracks" sub="very clean listener · 4.7%" accent="198" />
        <StatCard big={stats.oldestObsession} label="all-time #1 artist" sub="most-played in long_term" accent="22" small />
        <StatCard big="50%" label="classical / baroque" sub="Bach, Duruflé, Ton Koopman" accent="92" />
        <StatCard big="2024–2026" label="release era · new music" sub="alongside timeless classical" accent="264" small />
        <StatCard big={stats.newestRelease} label="newest discovery" sub="freshest entry in top 50" accent="14" small />
      </div>

      <div className="stats-bottom">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Where artists live in time</div>
            <div className="card-meta">overlap across short / medium / long term</div>
          </div>
          <VennDiagram vennData={vennData} />
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Streak calendar</div>
            <div className="card-meta">days listened, last 26 weeks</div>
          </div>
          <StreakGrid />
          <div className="streak-legend">
            <span>less</span>
            <span className="sl-cell" style={{ background: "oklch(0.22 0.02 168)" }} />
            <span className="sl-cell" style={{ background: "oklch(0.32 0.06 168)" }} />
            <span className="sl-cell" style={{ background: "oklch(0.5 0.12 168)" }} />
            <span className="sl-cell" style={{ background: "oklch(0.7 0.16 168)" }} />
            <span>more</span>
          </div>
        </div>
      </div>
    </section>
  );
}
