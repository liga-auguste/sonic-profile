const RANGES = [
  { id: "month", label: "Last Month", note: "4 weeks · short_term" },
  { id: "half", label: "6 Months", note: "26 weeks · medium_term" },
  { id: "all", label: "All Time", note: "long_term" },
];

export default function RangeToggle({ value, onChange }) {
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
