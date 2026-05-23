import type { RangeKey } from "../types";

const RANGES: { id: RangeKey; label: string; note: string }[] = [
  { id: "month", label: "Last Month", note: "4 weeks · short_term" },
  { id: "half",  label: "6 Months",   note: "26 weeks · medium_term" },
  { id: "all",   label: "All Time",   note: "long_term" },
];

interface RangeToggleProps {
  value: RangeKey;
  onChange: (value: RangeKey) => void;
}

export default function RangeToggle({ value, onChange }: RangeToggleProps) {
  return (
    <div className="range-toggle">
      {RANGES.map((r) => (
        <button
          key={r.id}
          className={`range-btn ${value === r.id ? "is-on" : ""}`}
          onClick={() => onChange(r.id)}
        >
          <span className="range-label">{r.label}</span>
          <span className="range-note">{r.note}</span>
        </button>
      ))}
    </div>
  );
}
