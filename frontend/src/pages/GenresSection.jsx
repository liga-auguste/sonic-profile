import { useState, useMemo } from "react";

const SOUND_DNA = [
  { name: "classical / baroque",       share: 50, hue: 42,  artists: ["Bach", "Duruflé", "Ton Koopman", "Amsterdam Baroque Orchestra"] },
  { name: "indie / singer-songwriter", share: 31, hue: 168, artists: ["Tom Misch", "Tom Odell", "Common Saints", "Nick Mulvey"] },
  { name: "funk / electronic",         share: 9,  hue: 332, artists: ["Franc Moody", "LEISURE", "RIO KOSTA", "Young Franco"] },
  { name: "jazz / ambient",            share: 7,  hue: 198, artists: ["Jan Garbarek", "Svaneborg Kardyb", "Rhye"] },
  { name: "hip-hop / R&B",             share: 3,  hue: 280, artists: ["Little Simz", "SAULT", "Malaki"] },
];

const ARTIST_UNIVERSE = [
  { name: "Tom Misch",                   x: 0.92, y: 0.82, size: 13, era: "long-time favorite", hue: 168 },
  { name: "Common Saints",               x: 0.55, y: 0.95, size: 15, era: "recent obsession",   hue: 332 },
  { name: "Tom Odell",                   x: 0.78, y: 0.74, size: 10, era: "long-time favorite", hue: 168 },
  { name: "Amsterdam Baroque Orchestra", x: 0.62, y: 0.42, size: 8,  era: "classical staple",   hue: 42  },
  { name: "Ton Koopman",                 x: 0.55, y: 0.32, size: 6,  era: "classical staple",   hue: 42  },
  { name: "Max Richter",                 x: 0.85, y: 0.45, size: 6,  era: "long-time favorite", hue: 168 },
  { name: "The Smile",                   x: 0.42, y: 0.62, size: 4,  era: "recent obsession",   hue: 332 },
  { name: "Víkingur Ólafsson",           x: 0.48, y: 0.28, size: 4,  era: "classical staple",   hue: 42  },
  { name: "LEISURE",                     x: 0.30, y: 0.55, size: 3,  era: "recent obsession",   hue: 332 },
  { name: "Angelo De Augustine",         x: 0.18, y: 0.68, size: 3,  era: "recent obsession",   hue: 332 },
];

const ERA_LEGEND = [
  { key: "recent obsession",   hue: 332 },
  { key: "long-time favorite", hue: 168 },
  { key: "classical staple",   hue: 42  },
];

function BubbleChart({ cloud, hovered, setHovered }) {
  const PAD = { l: 8, r: 6, t: 6, b: 14 };
  const place = (px, py) => ({
    left: `${PAD.l + px * (100 - PAD.l - PAD.r)}%`,
    top: `${PAD.t + (1 - py) * (100 - PAD.t - PAD.b)}%`,
  });

  return (
    <div className="bubble-card-wrap">
      <div className="bubble-axis-y">
        <span className="bax-top">tracks-heavy</span>
        <span className="bax-bot">artist-only</span>
      </div>

      <div className="bubble-wrap">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="bubble-grid">
          {[20, 40, 60, 80].map((v) => (
            <line key={`h${v}`} x1="0" y1={v} x2="100" y2={v} stroke="oklch(1 0 0 / 0.05)" strokeWidth="0.12" />
          ))}
          {[20, 40, 60, 80].map((v) => (
            <line key={`v${v}`} x1={v} y1="0" x2={v} y2="100" stroke="oklch(1 0 0 / 0.05)" strokeWidth="0.12" />
          ))}
          <line x1="50" y1="0" x2="50" y2="100" stroke="oklch(1 0 0 / 0.09)" strokeDasharray="0.6 0.8" strokeWidth="0.12" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="oklch(1 0 0 / 0.09)" strokeDasharray="0.6 0.8" strokeWidth="0.12" />
        </svg>

        <div className="bq bq-tl">currently obsessed<br /><em>+ in your tracks</em></div>
        <div className="bq bq-tr">forever in rotation<br /><em>+ in your tracks</em></div>
        <div className="bq bq-bl">just discovered</div>
        <div className="bq bq-br">canon · stays with you</div>

        {cloud.map((g) => {
          const pos = place(g.x, g.y);
          const r = 18 + g.size * 4.5;
          const dim = hovered && hovered !== g.name;
          const isHot = hovered === g.name;
          const topPct = parseFloat(pos.top);
          const leftPct = parseFloat(pos.left);
          const tipBelow = topPct < 35;
          let tipHAlign = "center";
          if (leftPct < 12) tipHAlign = "left";
          else if (leftPct > 88) tipHAlign = "right";
          const tipClass = `bubble-tooltip${tipBelow ? " bt-below" : ""}${tipHAlign !== "center" ? " bt-" + tipHAlign : ""}`;

          return (
            <div
              key={g.name}
              className="bubble"
              style={{
                left: pos.left,
                top: pos.top,
                width: `${r}px`,
                height: `${r}px`,
                background: `radial-gradient(circle at 30% 30%, oklch(0.78 0.18 ${g.hue} / 0.95), oklch(0.45 0.16 ${g.hue} / 0.55))`,
                opacity: dim ? 0.22 : 1,
                transform: `translate(-50%, -50%) scale(${isHot ? 1.08 : 1})`,
                zIndex: isHot ? 5 : 2,
              }}
              onMouseEnter={() => setHovered(g.name)}
              onMouseLeave={() => setHovered(null)}
            >
              {isHot && (
                <div className={tipClass}>
                  <div className="bt-name">{g.name}</div>
                  <div className="bt-meta">{g.era} · {g.size} appearances</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bubble-axis-x">
        <span>only short_term</span>
        <span className="bax-mid">consistency over time →</span>
        <span>all three ranges</span>
      </div>

      <div className="bubble-legend">
        {ERA_LEGEND.map((e) => (
          <div key={e.key} className="bleg-item">
            <span className="bleg-dot" style={{ background: `oklch(0.7 0.18 ${e.hue})` }} />
            <span>{e.key}</span>
          </div>
        ))}
        <div className="bleg-spacer" />
        <div className="bleg-note">size = total appearances across tops</div>
      </div>
    </div>
  );
}

export default function GenresSection() {
  const [hovered, setHovered] = useState(null);
  const totalShare = SOUND_DNA.reduce((s, b) => s + b.share, 0);

  return (
    <section className="section" id="section-genres">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">04 · genre dna</div>
          <h1 className="section-title">A taste, in pigments.</h1>
        </div>
        <div className="section-meta">
          <span>5 genre buckets · curated</span>
          <span className="dot-sep">●</span>
          <span>50 / 31 / 9 / 7 / 3</span>
        </div>
      </div>

      <div className="genre-grid">
        <div className="genre-strip-card">
          <div className="card-head">
            <div className="card-title">Sound DNA · genres</div>
            <div className="card-meta">% of top 150 tracks · curated buckets</div>
          </div>
          <div className="genre-strip">
            {SOUND_DNA.map((g) => (
              <div
                key={g.name}
                className="genre-stripe"
                style={{
                  width: `${(g.share / totalShare) * 100}%`,
                  background: `oklch(0.55 0.15 ${g.hue})`,
                  opacity: hovered && hovered !== g.name ? 0.35 : 1,
                }}
                onMouseEnter={() => setHovered(g.name)}
                onMouseLeave={() => setHovered(null)}
                title={`${g.name} — ${g.share}%`}
              />
            ))}
          </div>
          <div className="genre-bars">
            {SOUND_DNA.map((g) => (
              <div
                key={g.name}
                className={`genre-row ${hovered === g.name ? "is-hot" : ""}`}
                onMouseEnter={() => setHovered(g.name)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="genre-row-name">
                  <span className="genre-swatch" style={{ background: `oklch(0.6 0.15 ${g.hue})` }} />
                  <span>{g.name}</span>
                </div>
                <div className="genre-row-bar">
                  <div
                    className="genre-row-fill"
                    style={{
                      width: `${(g.share / SOUND_DNA[0].share) * 100}%`,
                      background: `oklch(0.55 0.14 ${g.hue})`,
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
                  ? SOUND_DNA.find((d) => d.name === hovered)?.artists
                  : SOUND_DNA[0]?.artists
              )?.join(" · ") || "—"}
            </div>
          </div>
        </div>

        <div className="genre-bubble-card">
          <div className="card-head">
            <div className="card-title">Artist universe</div>
            <div className="card-meta">x: consistency · y: track-vs-artist · size: presence</div>
          </div>
          <BubbleChart cloud={ARTIST_UNIVERSE} hovered={hovered} setHovered={setHovered} />
        </div>
      </div>
    </section>
  );
}
