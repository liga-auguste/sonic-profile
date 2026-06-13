import { useState } from "react";

const isTouchDevice = () => window.matchMedia("(hover: none)").matches;
import type { VennData, VennKey } from "../types";

const CIRCLES = [
  { id: "S", label: "last month", cx: 78,  cy: 70,  r: 52, hue: 332 },
  { id: "M", label: "6 months",   cx: 122, cy: 70,  r: 52, hue: 168 },
  { id: "L", label: "all-time",   cx: 100, cy: 100, r: 52, hue: 42  },
] as const;

export const REGIONS: { key: VennKey; x: number; y: number; label: string; hue: number }[] = [
  { key: "S_only", x: 50,  y: 56,  label: "last month only",       hue: 332 },
  { key: "M_only", x: 150, y: 56,  label: "6 months only",         hue: 168 },
  { key: "L_only", x: 100, y: 130, label: "all-time only",         hue: 42  },
  { key: "SM",     x: 100, y: 50,  label: "last month ∩ 6 months", hue: 250 },
  { key: "SL",     x: 72,  y: 100, label: "last month ∩ all-time", hue: 6   },
  { key: "ML",     x: 128, y: 100, label: "6 months ∩ all-time",   hue: 100 },
  { key: "ALL",    x: 100, y: 80,  label: "all three ranges",      hue: 200 },
];

interface VennDiagramProps {
  vennData: VennData;
  hot?: VennKey;
  onHot?: (key: VennKey) => void;
  hideSide?: boolean;
}

export default function VennDiagram({ vennData, hot: hotProp, onHot, hideSide }: VennDiagramProps) {
  const [hotInternal, setHotInternal] = useState<VennKey>("ALL");
  const hot = hotProp !== undefined ? hotProp : hotInternal;
  const setHot = onHot ?? setHotInternal;

  const region = REGIONS.find((r) => r.key === hot)!;
  const list   = vennData[hot] || [];
  const total  = vennData.counts[hot];

  const svg = (
    <svg viewBox="0 0 200 172" className="venn-svg" preserveAspectRatio="xMidYMid meet">
      {CIRCLES.map((c) => (
        <circle key={c.id} cx={c.cx} cy={c.cy} r={c.r}
          fill={`oklch(0.6 0.16 ${c.hue} / 0.18)`}
          stroke={`oklch(0.78 0.16 ${c.hue} / 0.7)`} strokeWidth="0.8" />
      ))}
      {CIRCLES.map((c) => (
        <text key={c.id + "l"} x={c.cx}
          y={c.id === "L" ? c.cy + c.r + 10 : c.cy - c.r - 6}
          textAnchor="middle" fontFamily="'JetBrains Mono', monospace"
          fontSize="7" fill={`oklch(0.85 0.1 ${c.hue})`}>
          {c.label}
        </text>
      ))}
      {REGIONS.map((r) => {
        const isHot = r.key === hot;
        return (
          <g key={r.key} className="venn-hit" onMouseEnter={() => setHot(r.key)}>
            <circle cx={r.x} cy={r.y} r={isHot ? 11 : 8.5}
              fill={`oklch(${isHot ? 0.78 : 0.32} 0.04 280)`}
              stroke={`oklch(0.78 0.16 ${r.hue})`}
              strokeWidth={isHot ? 1.4 : 0.6} />
            <text x={r.x} y={r.y + 2.5} textAnchor="middle"
              fontFamily="'Bricolage Grotesque', sans-serif"
              fontWeight="600" fontSize="8"
              fill={isHot ? "oklch(0.18 0.014 280)" : "oklch(0.95 0.01 280)"}>
              {vennData.counts[r.key]}
            </text>
          </g>
        );
      })}
    </svg>
  );

  if (hideSide) return svg;

  return (
    <div className="venn-wrap">
      {svg}
      <div className="venn-side">
        <div className="venn-side-label">{region.label}</div>
        <div className="venn-side-num">{total} <span>artists</span></div>
        <div className="venn-side-list">
          {list.length
            ? list.slice(0, 14).map((n) => <span key={n} className="venn-chip">{n}</span>)
            : <span className="venn-empty">—</span>}
          {list.length > 14 && <span className="venn-more">+{total - 14} more</span>}
        </div>
        <div className="venn-hint">{isTouchDevice() ? "tap" : "hover"} regions to explore</div>
      </div>
    </div>
  );
}
