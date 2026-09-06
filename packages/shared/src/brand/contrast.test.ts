import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  WCAG_AA_NORMAL_TEXT,
  contrastRatio,
  parseCssHexTokens,
  parseGradientHexStops,
  parseHexColor,
  readRootCssBlock,
} from "./contrast";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const readRepoFile = (relativePath: string): string =>
  readFileSync(join(repoRoot, relativePath), "utf8");

const WHITE = parseHexColor("#ffffff");

describe("brand contrast (Phase A / WCAG AA)", () => {
  const rootCss = readRootCssBlock(readRepoFile("apps/web/src/index.css"));

  it("light theme brand text on white meets AA for normal text", () => {
    const tokens = parseCssHexTokens(rootCss, ["brand", "brand-hover"]);
    for (const [name, hex] of Object.entries(tokens)) {
      const ratio = contrastRatio(parseHexColor(hex), WHITE);
      expect(ratio, `--${name} ${hex} on white`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    }
  });

  it("signature gradient stops meet AA for white button labels", () => {
    const tokens = parseCssHexTokens(rootCss, ["sf-gradient"]);
    const stops = parseGradientHexStops(tokens["sf-gradient"] ?? "");
    for (const hex of stops) {
      const ratio = contrastRatio(WHITE, parseHexColor(hex));
      expect(ratio, `white on gradient stop ${hex}`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    }
  });

  it("135° gradient stops meet AA for white button labels", () => {
    const tokens = parseCssHexTokens(rootCss, ["sf-gradient-135"]);
    const stops = parseGradientHexStops(tokens["sf-gradient-135"] ?? "");
    for (const hex of stops) {
      const ratio = contrastRatio(WHITE, parseHexColor(hex));
      expect(ratio, `white on gradient-135 stop ${hex}`).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    }
  });

  it("star gold token meets AA for white foreground", () => {
    const tokens = parseCssHexTokens(rootCss, ["sf-red"]);
    const ratio = contrastRatio(WHITE, parseHexColor(tokens["sf-red"] ?? ""));
    expect(ratio, `white on --sf-red ${tokens["sf-red"]}`).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    );
  });
});
