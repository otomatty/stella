import { escapeHtml } from "./slide-html.js";

// 確認ページの見た目だけで配信用の動画を作り直さないよう、このファイルは sceneGenerationCode に含めない。
export const VIDEO_CUE_CSS = /* css */ `/* apps/web/src/components/learner/VideoViewer.css の .video-viewer-media::cue に合わせる。 */
video::cue {
  color: #fff;
  background-color: rgba(0, 0, 0, 0.8);
  font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 700;
  text-shadow: none;
}`;

export type SceneVideoPreviewItem = {
  stageSlug: string;
  id: string;
  title: string;
  durationSec: number;
};

export function sceneVideosPreviewHtml(items: readonly SceneVideoPreviewItem[]): string {
  const cards = items
    .map(({ stageSlug, id, title, durationSec }) => {
      const base = [stageSlug, id].map(encodeURIComponent).join("/");
      return `<section>
<h2>${escapeHtml(`${stageSlug}/${id}`)} ${escapeHtml(title)}</h2>
<video controls preload="metadata" poster="${base}/poster.jpg">
  <source src="${base}/video.mp4" type="video/mp4">
  <track kind="captions" srclang="ja" label="日本語" src="${base}/captions.vtt" default>
</video>
<p class="meta">長さ ${durationSec.toFixed(2)} 秒</p>
</section>`;
    })
    .join("\n");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>教材動画の確認</title>
<style>
:root { color-scheme: light dark; --fg: #1f1f24; --muted: #6b6b76; --bg: #fff; }
@media (prefers-color-scheme: dark) { :root { --fg: #ececf1; --muted: #a0a0ab; --bg: #16161a; } }
body { margin: 0 auto; max-width: 980px; padding: 24px 16px 64px; font: 15px/1.6 system-ui, "Noto Sans JP", sans-serif; color: var(--fg); background: var(--bg); }
h1 { font-size: 22px; } h2 { font-size: 18px; margin: 40px 0 8px; }
video { width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 8px; }
${VIDEO_CUE_CSS}
.meta { color: var(--muted); font-size: 13px; }
</style></head><body>
<h1>教材動画の確認</h1>
<p class="meta">字幕は動画に焼き込まず &lt;track&gt; で重ねています。HTTP で開いてください (例: <code>python3 -m http.server -d &lt;出力先&gt;</code>)。</p>
${cards}
</body></html>`;
}
