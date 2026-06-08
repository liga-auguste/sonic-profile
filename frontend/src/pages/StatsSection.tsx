import { useState } from "react";
import { fmtNum } from "../utils";
import VennDiagram, { REGIONS } from "../components/VennDiagram";
import type { SpotifyData, VennData, VennKey } from "../types";

function HoursChart({ hours }: { hours: number[] }) {
  const max = Math.max(...hours, 1);
  const peakHour = hours.indexOf(max);
  const peakLabel = peakHour === 0 ? "12a" : peakHour < 12 ? `${peakHour}a` : peakHour === 12 ? "12p" : `${peakHour - 12}p`;
  return (
    <>
      <div className="hours-peak-label">peak: <span>{peakLabel}</span> · {max} plays</div>
      <div className="hours-chart">
        {hours.map((h, i) => (
          <div key={i} className="hours-col">
            <div className={`hours-bar ${h === max ? "is-peak" : ""}`}
              style={{ height: `${(h / max) * 100}%` }} title={`${i}:00 — ${h} plays`} />
          </div>
        ))}
      </div>
      <div className="hours-axis">
        <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span>
      </div>
    </>
  );
}

interface StatCardProps {
  big: string | number;
  label: string;
  sub: string;
  accent: string | number;
  small?: boolean;
  style?: React.CSSProperties;
}

function StatCard({ big, label, sub, accent, small, style }: StatCardProps) {
  return (
    <div className="stat-card" style={{ "--card-accent": `oklch(0.7 0.15 ${accent})`, ...style } as React.CSSProperties}>
      <div className="stat-tick" />
      <div className={`stat-big ${small ? "is-small" : ""}`}>{big}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

interface StatsSectionProps {
  data: SpotifyData;
  vennData: VennData;
}

export default function StatsSection({ data, vennData }: StatsSectionProps) {
  const { stats, genres } = data;
  const topGenre = genres?.[0];
  const [vennHot, setVennHot] = useState<VennKey>("ALL");
  const hotRegion = REGIONS.find((r) => r.key === vennHot)!;
  const hotList   = vennData[vennHot] || [];
  const hotTotal  = vennData.counts[vennHot];

  return (
    <section className="section" id="section-stats">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">04 · listening stats</div>
          <h1 className="section-title">Numbers that don't lie.</h1>
        </div>
        <div className="section-meta">
          <span>computed from top 50 × 3 ranges</span>
          <span className="dot-sep">●</span>
          <span>{new Date(stats.fetched_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="stats-bento">
        <StatCard style={{ gridColumn: 1, gridRow: 1 }}
          big={fmtNum(stats.uniqueArtists)} label="unique artists" sub="across all-time tops" accent="168" />
        <StatCard style={{ gridColumn: 2, gridRow: 1 }}
          big={stats.avgTrackLength} label="avg track length" sub={`across top ${stats.uniqueTracks} tracks`} accent="42" />
        <div className="card" style={{ gridColumn: "3 / 5", gridRow: 1 }}>
          <div className="card-head">
            <div className="card-title">Tracks played by hour</div>
            <div className="card-meta">{stats.hoursChart.reduce((a, b) => a + b, 0)} plays tracked</div>
          </div>
          <HoursChart hours={stats.hoursChart} />
        </div>

        <div className="stats-col-stack" style={{ gridColumn: 1, gridRow: "2 / 4", display: "flex", flexDirection: "column", gap: 12, justifyContent: "space-between" }}>
          <StatCard big={stats.oldestObsession} label="all-time #1 artist" sub="most consistent in long_term" accent="22" small />
          <StatCard big={`${stats.releaseYearOldest}–${stats.releaseYearNewest}`} label="release era span"
            sub={`peak: ${stats.releaseYearPeak}`} accent="264" small />
          <StatCard big={fmtNum(stats.uniqueTracks)} label="unique tracks" sub="across all 3 ranges" accent="130" />
        </div>

        <div className="card stats-bento-venn" style={{ gridColumn: "2 / 4", gridRow: "2 / 4" }}>
          <div className="card-head">
            <div className="card-title">Where artists live in time</div>
            <div className="card-meta">overlap across short / medium / long term</div>
          </div>
          <VennDiagram vennData={vennData} hot={vennHot} onHot={setVennHot} hideSide />
        </div>

        <div className="stat-card" style={{ gridColumn: 4, gridRow: 2, "--card-accent": `oklch(0.7 0.15 ${hotRegion.hue})` } as React.CSSProperties}>
          <div className="stat-tick" />
          <div className="stat-big" style={{ fontSize: 38 }}>{hotTotal}</div>
          <div className="stat-label">{hotRegion.label}</div>
          <div className="stat-sub">artists · hover venn to explore</div>
        </div>
        <div className="stat-card venn-chip-tile" style={{ gridColumn: 4, gridRow: 3, "--card-accent": `oklch(0.7 0.15 ${hotRegion.hue})` } as React.CSSProperties}>
          <div className="stat-tick" />
          <div className="venn-chip-list">
            {hotList.length
              ? hotList.slice(0, 10).map((n) => <span key={n} className="venn-chip">{n}</span>)
              : <span className="venn-empty">—</span>}
            {hotTotal > 10 && <span className="venn-more">+{hotTotal - 10} more</span>}
          </div>
        </div>

        <StatCard style={{ gridColumn: 1, gridRow: 4 }}
          big={stats.longestTrack} label="longest track" sub={stats.longestTrackName} accent="332" small />
        <StatCard style={{ gridColumn: 2, gridRow: 4 }}
          big={`${stats.explicitCount} / ${stats.uniqueTracks}`} label="explicit tracks"
          sub={`${((stats.explicitCount / stats.uniqueTracks) * 100).toFixed(1)}% of top tracks`} accent="198" />
        {topGenre && (
          <StatCard style={{ gridColumn: 3, gridRow: 4 }}
            big={`${topGenre.share}%`} label={topGenre.name} sub={topGenre.artists.slice(0, 3).join(" · ")} accent={topGenre.hue} />
        )}
        <StatCard style={{ gridColumn: 4, gridRow: 4 }}
          big={stats.newestRelease} label="newest discovery" sub="freshest entry in top 50" accent="14" small />
      </div>
    </section>
  );
}
