/**
 * 教材動画 (ナレーション付き解説動画) の生成。
 *
 *   bun run --filter=@stella/content video -- stages/it-basics --tts openjtalk
 *   bun run --filter=@stella/content video -- it-basics typescript-basics --tts fake --captioned
 *
 * 対象は `narration.json` を持つトピックだけ。トピックごとに:
 *   ② 読み上げ   Gemini はトピックごと、他は字幕ごとに TTS (dist/video-cache/tts にキャッシュ)
 *   ③ 同期       無音を削った音声の長さから timeline を決める
 *   ④ 描画       アプリと同じ slides-skin.css のスライドを Playwright で 1920x1080 に撮る
 *   ⑤ 書き出し   ffmpeg で video.mp4 (字幕は焼き込まない) + captions.vtt + poster.jpg
 *
 * 出力は `--out` (既定 dist/video) の `<stage>/<topicId>/`。一覧の確認ページ
 * `index.html` も書く (字幕 <track> は file:// では読めないので
 * `python3 -m http.server -d dist/video` などで開く)。`--captioned` を付けると、
 * 字幕を焼き込んだ確認用の `preview-captioned.mp4` も作る (本番は焼き込まない)。
 *
 * 配信は upload-videos.ts がこの生成処理を呼び、R2 と seed 用 manifest に登録する。
 */

import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { type Browser, chromium } from "playwright";

import { collectPdfTargets } from "../src/material-pdf.js";
import { SCREEN_VIDEO_FILES, selectVideoSource } from "../src/material-video.js";
import {
  estimateSpeechSeconds,
  formatIssue,
  type NarrationFile,
  slideHeading,
  speechOf,
} from "../src/narration.js";
import { splitNarration, trimSilence } from "../src/narration-split.js";
import { splitSlides } from "../src/split-slides.js";
import {
  buildTimeline,
  captionSegments,
  DEFAULT_TIMING,
  framesBetween,
  type Timeline,
  timelineToChaptersVtt,
  timelineToVtt,
} from "../src/video-timeline.js";
import {
  AUDIO_RATE,
  concatAndMux,
  decodePcm,
  decodeTrimmedPcm,
  encodeNarration,
  encodeStill,
  ffmpegVersion,
  type Loudness,
  measureLoudness,
  probeDuration,
  toPosterJpeg,
  VIDEO_FPS,
  writeNarrationWav,
} from "./lib/ffmpeg.js";
import {
  collectNarrationTopics,
  type NarrationTopic,
  validateTopic,
} from "./lib/narration-topics.js";
import { AUTOSCALE_SCRIPT, escapeHtml, slidesHtml } from "./lib/slide-html.js";
import {
  createTtsProvider,
  cueHash,
  mapPool,
  synthesizeCached,
  type TtsProvider,
  type TtsProviderName,
  type VoiceConfig,
} from "./lib/tts.js";

/**
 * 見た目・エンコード設定・同期の定数を変えたら上げる。ソースハッシュに入るので、
 * 上げると全トピックが作り直しになる (PDF_GENERATOR_VERSION と同じ運用)。
 */
const VIDEO_GENERATOR_VERSION = 1;

/** 読み上げ長 / 推定長 がこの範囲を外れたら読み飛ばし・繰り返しを疑う。 */
const AUDIO_RATIO_MIN = 0.4;
const AUDIO_RATIO_MAX = 2.0;

const here = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(here, "..");

// ---------------------------------------------------------------- 引数

export interface VideoPlan {
  stageSlug: string;
  id: string;
  sourceHash: string;
}

interface BuildOptions {
  outDir: string;
  cacheDir: string;
  captioned: boolean;
  keepWork: boolean;
}

// ---------------------------------------------------------------- 設定

type VoiceFile = { provider: TtsProviderName } & Partial<
  Record<TtsProviderName, Omit<VoiceConfig, "provider">>
>;

export function loadVideoVoice(providerOverride?: TtsProviderName): VoiceConfig {
  const file = JSON.parse(
    readFileSync(join(contentRoot, "narration", "voice.json"), "utf8"),
  ) as VoiceFile;
  const provider = providerOverride ?? file.provider;
  return { provider, ...(file[provider] ?? {}) };
}

// ---------------------------------------------------------------- 対象の列挙

interface VideoTopic extends NarrationTopic {
  narration: NarrationFile;
  source: ReturnType<typeof selectVideoSource>;
  /** lessons.markdown と同じ本文 (ノート除去済み・画像は R2 キー)。 */
  markdown: string;
  assets: Map<string, string>;
}

function collectTopics(selectors: string[]): { topics: VideoTopic[]; invalid: string[] } {
  const slidesTargets = new Map(
    collectPdfTargets(undefined, { includeFormat2Slides: true })
      .filter((t) => t.kind === "slides")
      .map((t) => [`${t.stageSlug}/${t.lessonId}`, t]),
  );
  const topics: VideoTopic[] = [];
  const invalid: string[] = [];
  // ponytail: 収録版も narration.json が必須で、無ければエラー。台本なしを許可するなら検査と対象の列挙を一緒に見直す。
  for (const topic of collectNarrationTopics(selectors)) {
    const label = `${topic.stageSlug}/${topic.id}`;
    if (topic.parseError !== undefined) invalid.push(`${label}: ${topic.parseError}`);
    let source: ReturnType<typeof selectVideoSource>;
    try {
      source = selectVideoSource(
        Object.fromEntries(
          SCREEN_VIDEO_FILES.map((name) => {
            const file = join(topic.topicDir, name);
            return [name, existsSync(file) ? readFileSync(file) : undefined];
          }),
        ),
        existsSync(topic.narrationFile),
      );
    } catch (error) {
      invalid.push(`${label}: ${(error as Error).message}`);
      continue;
    }
    if (!topic.narration) continue;
    const target = slidesTargets.get(label);
    if (!target) throw new Error(`manifest に ${label} がありません`);
    topics.push({
      ...topic,
      narration: topic.narration,
      source,
      courseTitle: target.courseTitle,
      markdown: target.source,
      assets: new Map(target.assets.map((a) => [a.key, a.file])),
    });
  }
  return { topics, invalid };
}

// ---------------------------------------------------------------- 1 トピックの生成

interface CuePlan {
  slide: number;
  index: number;
  text: string;
  speech: string;
  hash: string;
  file?: string;
}

interface TopicReport {
  stageSlug: string;
  id: string;
  title: string;
  sourceHash: string;
  generatorVersion: number;
  voice: string;
  durationSec: number;
  probedDurationSec: number;
  slides: { title: string; startSec: number; durationSec: number }[];
  cues: number;
  speechChars: number;
  /** 読み上げ文の字数 / 音声の秒数。 */
  charsPerSec: number;
  loudness: Loudness;
  bytes: { video: number; captionedPreview?: number };
  timingsMs: { audio: number; render: number; encode: number };
  warnings: string[];
  anomalies: string[];
}

function sourceHashOf(
  topic: VideoTopic,
  cues: CuePlan[],
  voice: VoiceConfig,
  provider: TtsProvider,
): string {
  const h = createHash("sha256");
  h.update(
    JSON.stringify({
      v: VIDEO_GENERATOR_VERSION,
      courseTitle: topic.courseTitle,
      timing: DEFAULT_TIMING,
      fps: VIDEO_FPS,
      narration: topic.narration,
      readings: topic.readings,
      voice,
      ttsUnit: provider.unit,
      css: readFileSync(
        resolve(contentRoot, "../../apps/web/src/components/learner/slides-skin.css"),
        "utf8",
      ),
      cues: cues.map((c) => [c.slide, c.text, c.hash]),
    }),
  );
  h.update(topic.markdown);
  for (const [key, file] of [...topic.assets].sort(([a], [b]) => a.localeCompare(b))) {
    h.update(key);
    h.update(readFileSync(file));
  }
  return h.digest("hex").slice(0, 32);
}

const VIDEO_CSS = `html, body { margin: 0; padding: 0; background: #fff; }
.video-caption {
  position: absolute; left: 50%; bottom: 34px; transform: translateX(-50%);
  max-width: 1120px; width: max-content; box-sizing: border-box;
  padding: 10px 24px; border-radius: 8px;
  background: rgba(24, 24, 30, 0.82); color: #fff;
  font: 500 30px/1.45 "Noto Sans JP", sans-serif; text-align: center; z-index: 10;
  text-wrap: balance; word-break: auto-phrase;
}`;

function slidesHeadings(topic: VideoTopic): { title: string; isTitleSlide: boolean }[] {
  return splitSlides(topic.slidesSource).map((s) => ({
    title: s.cls === "lead" ? topic.title : (slideHeading(s.body) ?? topic.title),
    isTitleSlide: s.cls === "lead",
  }));
}

async function screenshotSlides(
  browser: Browser,
  topic: VideoTopic,
  workDir: string,
  cues: CuePlan[],
  captioned: boolean,
): Promise<void> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1.5,
  });
  try {
    const page = await context.newPage();
    // PDF と同じく file:// 以外を遮断する (動画はリポジトリ内容だけから決まる)。
    await page.route(
      (url) => url.protocol !== "file:",
      (route) => route.abort(),
    );
    const htmlFile = join(workDir, "slides.html");
    writeFileSync(htmlFile, slidesHtml(topic.markdown, topic.courseTitle, topic.assets, VIDEO_CSS));
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.evaluate(AUTOSCALE_SCRIPT);
    const slides = page.locator(".sf-slide");
    const count = await slides.count();
    // 台本と timeline は slides.md の枚数、描画は lessons.markdown の枚数で数えている。
    // 食い違うと (空スライドなど) 静止画が欠けるので、ここで止める。
    const expected = splitSlides(topic.slidesSource).length;
    if (count !== expected) {
      throw new Error(`描画したスライドが ${count} 枚で、slides.md の ${expected} 枚と合いません`);
    }
    for (let i = 0; i < count; i++) {
      await slides.nth(i).screenshot({ path: join(workDir, `slide-${i}.png`) });
      if (!captioned) continue;
      for (const cue of cues.filter((c) => c.slide === i)) {
        await slides.nth(i).evaluate((el, text) => {
          const cap = document.createElement("div");
          cap.className = "video-caption";
          cap.textContent = text;
          el.appendChild(cap);
        }, cue.text);
        await slides.nth(i).screenshot({ path: join(workDir, `slide-${i}-cue-${cue.index}.png`) });
        await slides.nth(i).evaluate((el) => el.querySelector(".video-caption")?.remove());
      }
    }
  } finally {
    await context.close();
  }
}

async function encodeFromSegments(
  segments: { start: number; end: number; png: string }[],
  totalSec: number,
  workDir: string,
  prefix: string,
  audio: string,
  out: string,
): Promise<void> {
  const boundaries = [...segments.map((s) => s.start), totalSec];
  const frames = framesBetween(boundaries, VIDEO_FPS);
  const files: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    if (frames[i] <= 0) continue;
    const file = join(workDir, `${prefix}-${i}.mp4`);
    await encodeStill(segments[i].png, frames[i], file);
    files.push(file);
  }
  await concatAndMux(files, join(workDir, `${prefix}.txt`), audio, out);
}

async function buildTopic(
  topic: VideoTopic,
  cues: CuePlan[],
  sourceHash: string,
  provider: TtsProvider,
  browser: Browser,
  warnings: string[],
  { outDir, cacheDir, captioned, keepWork }: BuildOptions,
): Promise<TopicReport> {
  const topicOut = join(outDir, topic.stageSlug, topic.id);
  const workDir = join(topicOut, "work");
  rmSync(topicOut, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  const label = `${topic.stageSlug}/${topic.id}`;
  const anomalies: string[] = [];

  // ③ 同期: 無音を削った音声の長さを測る。
  let t0 = Date.now();
  let pcms: Int16Array[];
  if (provider.unit === "topic") {
    const speech = cues.map((c) => c.speech).join("\n\n");
    const weights = cues.map((c) => estimateSpeechSeconds(c.speech));
    let file = cues[0]?.file ?? "";
    pcms = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const pcm = await decodePcm(file);
      const split = splitNarration(pcm, AUDIO_RATE, weights);
      const problems: string[] = [];
      if (!split.ok) {
        problems.push(split.reason);
      } else {
        pcms = split.segments.map(({ start, end }) =>
          trimSilence(pcm.subarray(start, end), AUDIO_RATE),
        );
        for (let k = 0; k < cues.length; k++) {
          const seconds = pcms[k].length / AUDIO_RATE;
          const ratio = seconds / weights[k];
          if (ratio < AUDIO_RATIO_MIN || ratio > AUDIO_RATIO_MAX) {
            const cue = cues[k];
            problems.push(
              `slide ${cue.slide + 1} cue ${cue.index + 1}: 音声 ${seconds.toFixed(2)} 秒 / 推定 ${weights[k].toFixed(2)} 秒`,
            );
          }
        }
      }
      if (problems.length === 0) break;
      if (attempt === 1) {
        throw new Error(`${label}: 音声の分割・長さの検査に失敗しました — ${problems.join(" / ")}`);
      }
      file = (await synthesizeCached(provider, speech, cacheDir, true)).file;
    }
  } else {
    pcms = await mapPool(cues, 4, async (cue) => {
      let pcm = await decodeTrimmedPcm(cue.file ?? "");
      const estimate = estimateSpeechSeconds(cue.speech);
      let ratio = pcm.length / AUDIO_RATE / estimate;
      if ((ratio < AUDIO_RATIO_MIN || ratio > AUDIO_RATIO_MAX) && provider.nondeterministic) {
        const redo = await synthesizeCached(provider, cue.speech, cacheDir, true);
        pcm = await decodeTrimmedPcm(redo.file);
        ratio = pcm.length / AUDIO_RATE / estimate;
      }
      if (ratio < AUDIO_RATIO_MIN || ratio > AUDIO_RATIO_MAX) {
        anomalies.push(
          `slide ${cue.slide + 1} cue ${cue.index + 1}: 音声 ${(pcm.length / AUDIO_RATE).toFixed(2)} 秒 / 推定 ${estimate.toFixed(2)} 秒`,
        );
      }
      return pcm;
    });
    if (anomalies.length > 0 && provider.nondeterministic) {
      throw new Error(`${label}: 音声の長さが異常です — ${anomalies.join(" / ")}`);
    }
  }
  const headings = slidesHeadings(topic);
  const timeline: Timeline = buildTimeline(
    headings.map((h, i) => ({
      ...h,
      cues: cues
        .map((c, k) => ({ c, k }))
        .filter(({ c }) => c.slide === i)
        .map(({ c, k }) => ({ text: c.text, audioSec: pcms[k].length / AUDIO_RATE })),
    })),
  );
  const narrationWav = join(workDir, "narration.wav");
  const narrationM4a = join(workDir, "narration.m4a");
  writeNarrationWav(
    narrationWav,
    timeline.duration,
    timeline.cues.map((c, k) => ({ startSec: c.start, pcm: pcms[k] })),
  );
  await encodeNarration(narrationWav, narrationM4a);
  const loudness = await measureLoudness(narrationM4a);
  const audioMs = Date.now() - t0;

  // ④ 描画
  t0 = Date.now();
  await screenshotSlides(browser, topic, workDir, cues, captioned);
  const renderMs = Date.now() - t0;

  // ⑤ 書き出し
  t0 = Date.now();
  const videoFile = join(topicOut, "video.mp4");
  await encodeFromSegments(
    timeline.slides.map((s) => ({
      start: s.start,
      end: s.start + s.duration,
      png: join(workDir, `slide-${s.index}.png`),
    })),
    timeline.duration,
    workDir,
    "seg",
    narrationM4a,
    videoFile,
  );
  let captionedBytes: number | undefined;
  if (captioned) {
    const previewFile = join(topicOut, "preview-captioned.mp4");
    await encodeFromSegments(
      captionSegments(timeline).map((s) => ({
        start: s.start,
        end: s.end,
        png: join(
          workDir,
          s.cue === null ? `slide-${s.slide}.png` : `slide-${s.slide}-cue-${s.cue}.png`,
        ),
      })),
      timeline.duration,
      workDir,
      "cap",
      narrationM4a,
      previewFile,
    );
    captionedBytes = statSync(previewFile).size;
  }
  writeFileSync(join(topicOut, "captions.vtt"), timelineToVtt(timeline));
  writeFileSync(join(topicOut, "chapters.vtt"), timelineToChaptersVtt(timeline));
  const posterSlide = Math.max(
    0,
    headings.findIndex((h) => h.title === "結論"),
  );
  await toPosterJpeg(join(workDir, `slide-${posterSlide}.png`), join(topicOut, "poster.jpg"));
  const encodeMs = Date.now() - t0;
  const probed = await probeDuration(videoFile);
  if (!keepWork) rmSync(workDir, { recursive: true, force: true });

  const speechChars = cues.reduce((n, c) => n + [...c.speech.replace(/\s/g, "")].length, 0);
  const audioSec = pcms.reduce((n, p) => n + p.length / AUDIO_RATE, 0);
  const report: TopicReport = {
    stageSlug: topic.stageSlug,
    id: topic.id,
    title: topic.title,
    sourceHash,
    generatorVersion: VIDEO_GENERATOR_VERSION,
    voice: provider.identity,
    durationSec: timeline.duration,
    probedDurationSec: Math.round(probed * 1000) / 1000,
    slides: timeline.slides.map((s) => ({
      title: s.title,
      startSec: s.start,
      durationSec: s.duration,
    })),
    cues: cues.length,
    speechChars,
    charsPerSec: Math.round((speechChars / audioSec) * 100) / 100,
    loudness,
    bytes: { video: statSync(videoFile).size, captionedPreview: captionedBytes },
    timingsMs: { audio: audioMs, render: renderMs, encode: encodeMs },
    warnings,
    anomalies,
  };
  writeFileSync(
    join(topicOut, "timeline.json"),
    `${JSON.stringify({ ...timeline, cues: timeline.cues.map((c, k) => ({ ...c, speech: cues[k].speech })) }, null, 2)}\n`,
  );
  writeFileSync(join(topicOut, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function copyRecordedTopic(
  topic: VideoTopic,
  sourceHash: string,
  warnings: string[],
  outDir: string,
): Promise<TopicReport> {
  const videoFile = join(topic.topicDir, "screen.mp4");
  const durationSec = await probeDuration(videoFile);
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error("収録済み動画の長さを読み取れません");
  }
  const loudness = await measureLoudness(videoFile);
  const topicOut = resolve(outDir, topic.stageSlug, topic.id);
  if (!topicOut.startsWith(`${resolve(outDir)}${sep}`)) {
    throw new Error("動画の出力先が出力フォルダーの外にあります");
  }
  rmSync(topicOut, { recursive: true, force: true });
  mkdirSync(topicOut, { recursive: true });
  for (const [source, destination] of [
    ["screen.mp4", "video.mp4"],
    ["screen.vtt", "captions.vtt"],
    ["screen.jpg", "poster.jpg"],
  ]) {
    copyFileSync(join(topic.topicDir, source), join(topicOut, destination));
  }
  const report: TopicReport = {
    stageSlug: topic.stageSlug,
    id: topic.id,
    title: topic.title,
    sourceHash,
    generatorVersion: VIDEO_GENERATOR_VERSION,
    voice: "recorded",
    durationSec,
    probedDurationSec: Math.round(durationSec * 1000) / 1000,
    slides: [],
    cues: (readFileSync(join(topicOut, "captions.vtt"), "utf8").match(/ --> /g) ?? []).length,
    speechChars: 0,
    charsPerSec: 0,
    loudness,
    bytes: { video: statSync(join(topicOut, "video.mp4")).size },
    timingsMs: { audio: 0, render: 0, encode: 0 },
    warnings,
    anomalies: [],
  };
  writeFileSync(join(topicOut, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

// ---------------------------------------------------------------- 一覧ページ

function indexHtml(reports: TopicReport[], outDir: string): string {
  const fmt = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
  const cards = reports
    .map((r) => {
      const base = `${r.stageSlug}/${r.id}`;
      const recorded = r.voice === "recorded";
      const timeline: { cues: { slide: number; start: number; text: string; speech: string }[] } =
        recorded
          ? { cues: [] }
          : JSON.parse(readFileSync(join(outDir, base, "timeline.json"), "utf8"));
      const rows = timeline.cues
        .map(
          (c) =>
            `<tr><td>${fmt(c.start)}</td><td>${c.slide + 1}</td><td>${escapeHtml(c.text)}${
              c.speech !== c.text ? `<div class="speech">読み: ${escapeHtml(c.speech)}</div>` : ""
            }</td></tr>`,
        )
        .join("");
      const notes = [...r.warnings, ...r.anomalies]
        .map((w) => `<li>${escapeHtml(w)}</li>`)
        .join("");
      return `<section>
<h2>${escapeHtml(r.id)} ${escapeHtml(r.title)} <small>${escapeHtml(r.stageSlug)}</small></h2>
<video controls preload="metadata" poster="${base}/poster.jpg">
  <source src="${base}/video.mp4" type="video/mp4">
  <track kind="captions" srclang="ja" label="日本語" src="${base}/captions.vtt" default>
  ${recorded ? "" : `<track kind="chapters" srclang="ja" src="${base}/chapters.vtt">`}
</video>
<p class="meta">長さ ${fmt(r.durationSec)} ・ 字幕 ${r.cues}${recorded ? "" : ` ・ ${r.charsPerSec} 字/秒`} ・ ${r.loudness.integratedLufs} LUFS ・ ${(r.bytes.video / 1024 / 1024).toFixed(1)} MB ・ ${escapeHtml(r.voice)}${
        r.bytes.captionedPreview
          ? ` ・ <a href="${base}/preview-captioned.mp4">字幕焼き込み版</a>`
          : ""
      }</p>
${notes ? `<ul class="notes">${notes}</ul>` : ""}
${recorded ? "" : `<details><summary>台本 (${r.cues} 字幕)</summary><table><thead><tr><th>時刻</th><th>枚</th><th>字幕</th></tr></thead><tbody>${rows}</tbody></table></details>`}
</section>`;
    })
    .join("\n");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>教材動画 PoC</title>
<style>
:root { color-scheme: light dark; --fg: #1f1f24; --muted: #6b6b76; --line: #e3e3e8; --bg: #fff; }
@media (prefers-color-scheme: dark) { :root { --fg: #ececf1; --muted: #a0a0ab; --line: #34343c; --bg: #16161a; } }
body { margin: 0 auto; max-width: 980px; padding: 24px 16px 64px; font: 15px/1.6 system-ui, "Noto Sans JP", sans-serif; color: var(--fg); background: var(--bg); }
h1 { font-size: 22px; } h2 { font-size: 18px; margin: 40px 0 8px; } small { color: var(--muted); font-weight: normal; }
video { width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 8px; }
.meta { color: var(--muted); font-size: 13px; } .notes { color: #b25c00; font-size: 13px; }
table { border-collapse: collapse; width: 100%; font-size: 13px; } td, th { border-bottom: 1px solid var(--line); padding: 4px 6px; text-align: left; vertical-align: top; }
td:first-child, td:nth-child(2) { white-space: nowrap; color: var(--muted); } .speech { color: var(--muted); }
</style></head><body>
<h1>教材動画 PoC</h1>
<p class="meta">生成 ${new Date().toISOString()} ・ ${reports.length} 本。字幕は &lt;track&gt; なので HTTP で開いてください (例: <code>python3 -m http.server -d packages/content/dist/video</code>)。</p>
${cards}
</body></html>`;
}

/** 1 トピックの出力一式。どれかが欠けていれば作り直す。 */
function outputFiles(captioned: boolean, recorded: boolean): string[] {
  if (recorded) return ["video.mp4", "captions.vtt", "poster.jpg", "report.json"];
  const base = [
    "video.mp4",
    "captions.vtt",
    "chapters.vtt",
    "poster.jpg",
    "timeline.json",
    "report.json",
  ];
  return captioned ? [...base, "preview-captioned.mp4"] : base;
}

// ---------------------------------------------------------------- main

/** CLI と配信が共用する。skip は R2 に出力一式がある場合だけ true を返す。 */
export async function buildVideos(
  args: string[] = [],
  skip: (plan: VideoPlan) => boolean = () => false,
): Promise<{ reports: TopicReport[]; failures: string[] }> {
  function argValue(name: string): string | null {
    const i = args.indexOf(name);
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
  }
  const VALUE_FLAGS = ["--tts", "--out", "--concurrency"];
  const outDir = resolve(contentRoot, argValue("--out") ?? join("dist", "video"));
  const cacheDir = join(contentRoot, "dist", "video-cache", "tts");
  const concurrency = Number(argValue("--concurrency") ?? 2);
  const captioned = args.includes("--captioned");
  const force = args.includes("--force");
  const keepWork = args.includes("--keep-work");
  const selectors = args.filter(
    (a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(args[i - 1] ?? ""),
  );

  const voice = loadVideoVoice(argValue("--tts") as TtsProviderName | undefined);
  const provider = createTtsProvider(voice);
  const { topics, invalid } = collectTopics(selectors);
  const failures: string[] = [...invalid];

  // 台本の検証 (エラーのあるトピックは作らない)
  const plans: {
    topic: VideoTopic;
    cues: CuePlan[];
    warnings: string[];
    recorded: boolean;
    sourceHash: string;
  }[] = [];
  for (const topic of topics) {
    const label = `${topic.stageSlug}/${topic.id}`;
    const source = topic.source;
    const issues = validateTopic(topic, topic.narration);
    for (const issue of issues) console.log(formatIssue(label, issue));
    if (issues.some((i) => i.level === "error")) {
      failures.push(`${label}: 台本の検証エラー`);
      continue;
    }
    const cues: CuePlan[] =
      source.kind === "recorded"
        ? []
        : topic.narration.slides.flatMap((s, i) =>
            s.cues.map((c, j) => {
              const speech = speechOf(c, topic.readings);
              return {
                slide: i,
                index: j,
                text: c.text,
                speech,
                hash: cueHash(provider.identity, speech),
              };
            }),
          );
    plans.push({
      topic,
      cues,
      recorded: source.kind === "recorded",
      sourceHash:
        source.kind === "recorded" ? source.sourceHash : sourceHashOf(topic, cues, voice, provider),
      warnings: issues.filter((i) => i.level === "warning").map((i) => formatIssue("", i).slice(2)),
    });
  }

  const skipped = new Set<string>();
  const pending = plans.filter(({ topic, recorded, sourceHash }) => {
    if (
      skip({
        stageSlug: topic.stageSlug,
        id: topic.id,
        sourceHash,
      })
    ) {
      skipped.add(`${topic.stageSlug}/${topic.id}`);
      return false;
    }
    if (force) return true;
    const topicOut = join(outDir, topic.stageSlug, topic.id);
    // 1 つでも欠けていれば作り直す (途中で止まった回や、一部だけ消された出力を補う)。
    if (outputFiles(captioned, recorded).some((f) => !existsSync(join(topicOut, f)))) return true;
    const report = JSON.parse(readFileSync(join(topicOut, "report.json"), "utf8")) as TopicReport;
    return report.sourceHash !== sourceHash;
  });
  console.log(
    `video: ${plans.length} topics with narration (generate ${pending.length}, up to date ${plans.length - pending.length}) — ${provider.identity}`,
  );
  console.log(`  ${await ffmpegVersion()}`);

  // ② 読み上げ。同じ読み上げ文はプロバイダの合成単位ごとに 1 回だけ合成する。
  const ttsStart = Date.now();
  let ttsMs: number;
  let buildable: typeof pending;
  if (provider.unit === "topic") {
    const generated = pending.filter((p) => !p.recorded);
    const entries = generated.map((plan) => {
      const speech = plan.cues.map((c) => c.speech).join("\n\n");
      return { plan, speech, hash: cueHash(provider.identity, speech) };
    });
    const unique = [...new Map(entries.map(({ hash, speech }) => [hash, speech])).entries()];
    const files = new Map<string, string>();
    const errors = new Map<string, string>();
    let synthesized = 0;
    await mapPool(unique, provider.concurrency, async ([hash, speech]) => {
      try {
        const res = await synthesizeCached(provider, speech, cacheDir);
        files.set(hash, res.file);
        if (!res.cached) synthesized++;
      } catch (e) {
        errors.set(hash, (e as Error).message.split("\n")[0]);
      }
    });
    const failed = new Set<(typeof pending)[number]>();
    for (const { plan, hash } of entries) {
      if (errors.has(hash)) {
        failed.add(plan);
        const label = `${plan.topic.stageSlug}/${plan.topic.id}`;
        failures.push(`${label}: 読み上げに失敗しました (${errors.get(hash)})`);
        console.warn(`  ✗ ${label}: 読み上げに失敗したので作りません`);
      } else {
        for (const cue of plan.cues) cue.file = files.get(hash);
      }
    }
    ttsMs = Date.now() - ttsStart;
    const cueCount = generated.reduce((n, p) => n + p.cues.length, 0);
    console.log(
      `  TTS: ${generated.length} topics / ${cueCount} cues (${synthesized} synthesized, ${failed.size} failed) in ${(ttsMs / 1000).toFixed(1)}s`,
    );
    buildable = pending.filter((p) => !failed.has(p));
  } else {
    // ② 読み上げ (全トピックの字幕をまとめて並列に)。同じ読み上げ文は 1 回だけ合成する。
    // 失敗はトピック単位で数える — 1 つの字幕が再試行しても通らなくても、
    // 他のトピックの動画は作る。
    const allCues = pending.flatMap((p) => p.cues);
    const unique = [...new Map(allCues.map((c) => [c.hash, c.speech])).entries()];
    let synthesized = 0;
    const files = new Map<string, string>();
    const ttsErrors = new Map<string, string>();
    await mapPool(unique, provider.concurrency, async ([hash, speech]) => {
      try {
        const res = await synthesizeCached(provider, speech, cacheDir);
        files.set(hash, res.file);
        if (!res.cached) synthesized++;
      } catch (e) {
        ttsErrors.set(hash, (e as Error).message.split("\n")[0]);
      }
    });
    for (const cue of allCues) cue.file = files.get(cue.hash);
    ttsMs = Date.now() - ttsStart;
    console.log(
      `  TTS: ${allCues.length} cues / ${unique.length} unique (${synthesized} synthesized, ${ttsErrors.size} failed) in ${(ttsMs / 1000).toFixed(1)}s`,
    );
    buildable = pending.filter(({ topic, cues }) => {
      const failed = cues.find((c) => ttsErrors.has(c.hash));
      if (!failed) return true;
      const label = `${topic.stageSlug}/${topic.id}`;
      failures.push(
        `${label}: 読み上げに失敗しました (slide ${failed.slide + 1} cue ${failed.index + 1}: ${ttsErrors.get(failed.hash)})`,
      );
      console.warn(`  ✗ ${label}: 読み上げに失敗した字幕があるので作りません`);
      return false;
    });
  }

  const reports: TopicReport[] = [];
  for (const { topic, sourceHash, warnings } of buildable.filter((p) => p.recorded)) {
    const label = `${topic.stageSlug}/${topic.id}`;
    try {
      const report = await copyRecordedTopic(topic, sourceHash, warnings, outDir);
      reports.push(report);
      console.log(`  ✓ ${label} ${report.durationSec.toFixed(1)}s (収録済み動画をコピー)`);
    } catch (e) {
      failures.push(`${label}: ${(e as Error).message.split("\n")[0]}`);
      console.warn(`  ✗ ${label}: ${(e as Error).message}`);
    }
  }
  const generated = buildable.filter((p) => !p.recorded);
  if (generated.length > 0) {
    const executablePath = existsSync("/opt/pw-browsers/chromium")
      ? "/opt/pw-browsers/chromium"
      : undefined;
    const browser = await chromium.launch(executablePath ? { executablePath } : {});
    try {
      await mapPool(generated, concurrency, async ({ topic, cues, warnings, sourceHash }) => {
        const label = `${topic.stageSlug}/${topic.id}`;
        try {
          const report = await buildTopic(topic, cues, sourceHash, provider, browser, warnings, {
            outDir,
            cacheDir,
            captioned,
            keepWork,
          });
          reports.push(report);
          console.log(
            `  ✓ ${label} ${report.durationSec.toFixed(1)}s (audio ${report.timingsMs.audio}ms / render ${report.timingsMs.render}ms / encode ${report.timingsMs.encode}ms)`,
          );
        } catch (e) {
          failures.push(`${label}: ${(e as Error).message.split("\n")[0]}`);
          console.warn(`  ✗ ${label}: ${(e as Error).message}`);
        }
      });
    } finally {
      await browser.close();
    }
  }

  // 一覧は出力済みの全トピックで作り直す (今回作らなかった最新分も載せる)
  const allReports = plans
    .filter(({ topic }) => !skipped.has(`${topic.stageSlug}/${topic.id}`))
    .map(({ topic }) => join(outDir, topic.stageSlug, topic.id, "report.json"))
    .filter((f) => existsSync(f))
    .map((f) => JSON.parse(readFileSync(f, "utf8")) as TopicReport);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), indexHtml(allReports, outDir));
  writeFileSync(
    join(outDir, "summary.json"),
    `${JSON.stringify({ voice: provider.identity, ttsMs, generated: reports.length, failures }, null, 2)}\n`,
  );
  console.log(
    `✓ ${relative(process.cwd(), join(outDir, "index.html"))} (${allReports.length} videos)`,
  );

  if (failures.length > 0) {
    console.error(`✗ ${failures.length} topics failed:\n  ${failures.join("\n  ")}`);
  }
  return {
    reports: allReports.filter((r) =>
      plans.some(
        ({ topic, sourceHash }) =>
          topic.stageSlug === r.stageSlug && topic.id === r.id && sourceHash === r.sourceHash,
      ),
    ),
    failures,
  };
}

if (import.meta.main) {
  const { failures } = await buildVideos(process.argv.slice(2));
  if (failures.length > 0) process.exitCode = 1;
}
