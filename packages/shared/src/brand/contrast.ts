/** WCAG 2.x relative luminance and contrast helpers for brand token checks. */

export type Rgb = readonly [r: number, g: number, b: number];

const channelLinear = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = ([r, g, b]: Rgb): number =>
  0.2126 * channelLinear(r) + 0.7152 * channelLinear(g) + 0.0722 * channelLinear(b);

export const contrastRatio = (foreground: Rgb, background: Rgb): number => {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

export const parseHexColor = (hex: string): Rgb => {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
};

/** WCAG AA minimum for normal-sized text. */
export const WCAG_AA_NORMAL_TEXT = 4.5;

/** Extract `--name: #rrggbb;` tokens from a CSS block (e.g. `:root { ... }`). */
export const parseCssHexTokens = (
  css: string,
  names: readonly string[],
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const name of names) {
    const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`, "is"));
    if (!match?.[1]) {
      throw new Error(`Missing CSS token --${name}`);
    }
    out[name] = match[1];
  }
  return out;
};

/** Pull the first `:root { ... }` block from app CSS. */
export const readRootCssBlock = (css: string): string => {
  const match = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!match?.[1]) {
    throw new Error("Missing :root CSS block");
  }
  return match[1];
};

/** Parse `#rrggbb` stops from a linear-gradient(...) value. */
export const parseGradientHexStops = (gradient: string): string[] => {
  const matches = gradient.match(/#[0-9a-f]{6}/gi);
  if (!matches?.length) {
    throw new Error("No hex stops found in gradient");
  }
  return matches;
};
