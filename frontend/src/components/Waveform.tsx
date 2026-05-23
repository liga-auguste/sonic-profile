import { useMemo } from "react";

interface WaveformProps {
  seed?: number;
  bars?: number;
  height?: number;
  color?: string;
}

export default function Waveform({ seed = 1, bars = 48, height = 28, color = "var(--accent)" }: WaveformProps) {
  const heights = useMemo(() => {
    const out: number[] = [];
    let s = seed * 9301 + 49297;
    for (let i = 0; i < bars; i++) {
      s = (s * 9301 + 49297) % 233280;
      const r = s / 233280;
      const env = Math.sin((i / bars) * Math.PI) * 0.7 + 0.3;
      out.push(Math.max(0.12, r * env));
    }
    return out;
  }, [seed, bars]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{ width: 2, height: `${h * 100}%`, background: color, borderRadius: 1, opacity: 0.85 }}
        />
      ))}
    </div>
  );
}
