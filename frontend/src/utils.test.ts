import { describe, it, expect } from "vitest";
import { fmtMs, fmtNum, hashHue } from "./utils";

describe("fmtMs", () => {
  it("formats whole minutes", () => expect(fmtMs(180000)).toBe("3:00"));
  it("pads seconds", () => expect(fmtMs(185000)).toBe("3:05"));
  it("handles zero", () => expect(fmtMs(0)).toBe("0:00"));
  it("handles long tracks", () => expect(fmtMs(628000)).toBe("10:28"));
});

describe("fmtNum", () => {
  it("formats thousands with commas", () => expect(fmtNum(1000)).toBe("1,000"));
  it("handles zero", () => expect(fmtNum(0)).toBe("0"));
  it("handles null-ish values", () => expect(fmtNum(null as unknown as number)).toBe("0"));
});

describe("hashHue", () => {
  it("returns a value between 0 and 359", () => {
    expect(hashHue("Tom Odell")).toBeGreaterThanOrEqual(0);
    expect(hashHue("Tom Odell")).toBeLessThan(360);
  });
  it("is deterministic", () => expect(hashHue("Coldplay")).toBe(hashHue("Coldplay")));
  it("differs for different strings", () => expect(hashHue("AURORA")).not.toBe(hashHue("Jungle")));
  it("handles empty string", () => expect(hashHue("")).toBe(0));
});
