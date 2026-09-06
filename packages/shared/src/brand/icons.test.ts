import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const publicDir = join(repoRoot, "apps/web/public");

const pngDimensions = (filePath: string): { width: number; height: number } => {
  const buf = readFileSync(filePath);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
};

/** Android maskable safe zone: center ~80% diameter circle → 10% inset on each edge. */
const MASKABLE_SAFE_INSET_RATIO = 0.1;

const starBoundsFromPath = (
  pathD: string,
): { minX: number; maxX: number; minY: number; maxY: number } => {
  const numbers = pathD.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    xs.push(numbers[i] ?? 0);
    ys.push(numbers[i + 1] ?? 0);
  }
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

describe("PWA / touch icons (Phase A)", () => {
  it("apple-touch-icon is 180×180", () => {
    const { width, height } = pngDimensions(join(publicDir, "apple-touch-icon.png"));
    expect(width).toBe(180);
    expect(height).toBe(180);
  });

  it("maskable SVG star sits inside the Android safe zone", () => {
    const svg = readFileSync(join(publicDir, "icon-maskable.svg"), "utf8");
    const pathMatch = svg.match(/<path[^>]*\sd="([^"]+)"/i);
    expect(pathMatch?.[1], "maskable star path").toBeTruthy();
    const bounds = starBoundsFromPath(pathMatch?.[1] ?? "");
    const viewSize = 512;
    const inset = viewSize * MASKABLE_SAFE_INSET_RATIO;
    const safeMin = inset;
    const safeMax = viewSize - inset;
    expect(bounds.minX).toBeGreaterThanOrEqual(safeMin);
    expect(bounds.minY).toBeGreaterThanOrEqual(safeMin);
    expect(bounds.maxX).toBeLessThanOrEqual(safeMax);
    expect(bounds.maxY).toBeLessThanOrEqual(safeMax);
  });

  it("index.html links apple-touch-icon", () => {
    const html = readFileSync(join(repoRoot, "apps/web/index.html"), "utf8");
    expect(html).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"');
  });
});
