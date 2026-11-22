export const VIDEO_COLORS = {
  white: "#FFFFFF",
  ink: "#0E0E10",
  blue: "#2563EB",
  pink: "#E62F9A",
  violet: "#5749DB",
  line: "#DDDDE2",
  code: "#16161A",
} as const;

export const VIDEO_FONT = "'Noto Sans JP', sans-serif";
export const VIDEO_CODE_FONT = "'JetBrains Mono',ui-monospace,monospace";
export const WHITE_FADE_SECONDS = 0.4;
export const OVERLAY_FADE_SECONDS = 0.3;

export const codeColorsCss = `.hljs-keyword,.hljs-literal{color:#c4a5ff}.hljs-number{color:#ffcd91}.hljs-string,.hljs-template-variable{color:#b5e39c}.hljs-title,.hljs-type{color:#96d4ff}.hljs-comment{color:#a0a0ac}.hljs-built_in,.hljs-params{color:#f4dfa3}`;
export const codeTextWidth = (line: string) =>
  Array.from(line).reduce((width, c) => width + (/[\x20-\x7e]/u.test(c) ? 0.61 : 1), 0);

const dialogWidth = 1240;
const dialogPadding = 32;
export const dialogFontSize = (lines: string[]) =>
  Math.min(
    34,
    Math.floor((dialogWidth - 4 * dialogPadding) / Math.max(1, ...lines.map(codeTextWidth))),
  );

export const overlayBackdrop = (dialog: boolean) =>
  dialog ? "rgba(14,14,16,0.55)" : "rgba(14,14,16,0.78)";

export const beatOverlayCss = `#beat-overlay{position:absolute;inset:0;z-index:5;display:grid;place-items:center;color:white;text-align:center;opacity:0;visibility:hidden;pointer-events:none}`;
export const termOverlayCss = `
    .term-text{max-width:1800px;margin:auto;font-size:120px;font-weight:700;line-height:1.2;white-space:nowrap}
    .term-line{width:96px;height:6px;background:${VIDEO_COLORS.pink};margin:24px auto}
    .term-note{font-size:44px;color:${VIDEO_COLORS.line}}
    .term-text rt{line-height:1;font-size:40px}
`;
export const dialogOverlayCss = `
    .code-dialog{width:${dialogWidth}px;border-radius:24px;background:white;box-shadow:0 16px 60px #00000040;overflow:hidden}
    .dialog-heading{position:relative;display:grid;place-items:center;height:88px;border-bottom:2px solid ${VIDEO_COLORS.line}}
    .dialog-heading::before{content:'';position:absolute;left:${dialogPadding}px;width:16px;height:16px;border-radius:50%;background:${VIDEO_COLORS.line};box-shadow:28px 0 ${VIDEO_COLORS.line},56px 0 ${VIDEO_COLORS.line}}
    .dialog-title{max-width:calc(100% - 240px);margin:0;color:${VIDEO_COLORS.ink};font-size:36px;font-weight:700;white-space:nowrap;overflow:hidden}
    .dialog-code{margin:${dialogPadding}px;padding:${dialogPadding}px;border-radius:12px;background:${VIDEO_COLORS.code};color:#F4F4F6;text-align:left;line-height:1.5;font-family:${VIDEO_CODE_FONT};font-weight:400;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0;overflow:hidden}
    .dialog-code code{font:inherit}
`;

/** HTML 側では関数そのものをブラウザーへ送るため、外側の変数を参照しない。 */
export function beatOverlayFrame(
  beats: { start: number; end: number }[],
  time: number,
  fade: number,
) {
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const index = beats.findIndex(({ start, end }) => time >= start && time < end + fade);
  const beat = beats[index];
  const progress = beat ? clamp((time - beat.start) / fade) : 0;
  const opacity = beat ? Math.min(progress, clamp((beat.end + fade - time) / fade)) : 0;
  const enter = beat && time < beat.end ? 1 - (1 - progress) ** 3 : 1;
  return { index, opacity, scale: 0.94 + 0.06 * enter };
}
