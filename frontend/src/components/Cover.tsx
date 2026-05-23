import { useState } from "react";
import { hashHue } from "../utils";

interface CoverProps {
  src?: string;
  alt?: string;
  hue?: number;
  size?: number;
  radius?: number;
  round?: boolean;
}

export default function Cover({ src, alt, hue, size = 64, radius = 6, round }: CoverProps) {
  const [errored, setErrored] = useState(false);
  const initials = (alt || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const r = round ? "50%" : radius + "px";

  if (src && !errored) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: r,
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: `0 8px 24px -12px oklch(0 0 0 / 0.7)`,
          background: `oklch(0.25 0.04 ${hue || 0})`,
        }}
      >
        <img
          src={src}
          alt={alt || ""}
          onError={() => setErrored(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  const h = hue ?? hashHue(alt ?? "");
  const h2 = (h + 60) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(135deg, oklch(0.32 0.12 ${h}), oklch(0.55 0.16 ${h2}))`,
        display: "grid",
        placeItems: "center",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: Math.max(10, size * 0.18),
        color: `oklch(0.96 0.04 ${h})`,
        letterSpacing: "0.05em",
      }}
    >
      {initials}
    </div>
  );
}
