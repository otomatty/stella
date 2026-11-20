import { codeFontCss } from "./lib/scene-code-html.js";
import { createHash } from "node:crypto";
import { storyboardAssets, extractClipFrames } from "./lib/storyboard-assets.js";
/** 場面ごとの動画。CLI とデプロイの動画生成で共用する。 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import { estimateSpeechSeconds, speechOf } from "../src/narration.js";
import { splitNarration, trimSilence } from "../src/narration-split.js";
import { sceneSpeeches, sceneVideoSequence, type TextScene } from "../src/scene-timeline.js";
import { mixSceneSfx, sceneSfxCues, synthesizeSceneSfx } from "../src/scene-sfx.js";
import {
  parseStoryboard,
  sceneBoardName,
  storyboardStates,
  type Scene,
  type ViewSceneState,
} from "../src/video-storyboard.js";
import {
  AUDIO_RATE,
  decodePcm,
  decodeTrimmedPcm,
  encodeNarration,
  measureLoudness,
  probeDuration,
  toPosterJpeg,
  writeNarrationWav,
} from "./lib/ffmpeg.js";
import { collectNarrationTopics, contentRoot } from "./lib/narration-topics.js";
import { sceneCacheHash, sceneVideoSourceHash, touchVideoCacheFile } from "./lib/scene-cache.js";
import { sceneHtml, textSceneHtml, sceneFontCss, type ScenePageWindow } from "./lib/scene-html.js";
import { encodeScene, runFfmpeg } from "./lib/scene-encode.js";
import {
  createTtsProvider,
  QuotaExhaustedError,
  mapPool,
  synthesizeCached,
  type TtsProvider,
  type TtsProviderName,
  type VoiceConfig,
} from "./lib/tts.js";

export const SCENE_GENERATOR_VERSION = 1;
const GENERATOR_VERSION = SCENE_GENERATOR_VERSION;
/** 指定の出力先の直下だけを掃除し、リンクで別のフォルダーを消さない。 */
export function prepareSceneStills(outputRoot: string, stage: string, topic: string): string {
  if (![stage, topic].every((part) => /^[\w-]+$/.test(part)))
    throw new Error("静止画の出力先が想定の場所ではありません");
  mkdirSync(outputRoot, { recursive: true });
  let dir = realpathSync(outputRoot);
  for (const part of [stage, topic, "stills"]) {
    const expected = join(dir, part);
    mkdirSync(expected, { recursive: true });
    if (realpathSync(expected) !== expected)
      throw new Error("静止画の出力先が想定の場所ではありません");
    dir = expected;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if ((entry.isFile() || entry.isSymbolicLink()) && /\.png$/i.test(entry.name))
      unlinkSync(join(dir, entry.name));
  }
  return dir;
}
export function argumentsOf(args: string[]) {
  const selectors: string[] = [];
  const refreshAudio: string[] = [];
  let stills = false,
    tts: TtsProviderName | undefined,
    ttsModel = process.env.VIDEO_TTS_MODEL?.trim() || undefined,
    out = join(contentRoot, "dist/video");
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--") continue;
    if (a === "--stills") stills = true;
    else if (a === "--refresh-audio") {
      const value = args[++i];
      if (!value || value.startsWith("--") || value.split(",").some((id) => !id.trim()))
        throw new Error("--refresh-audio にカンマ区切りの場面のidを指定してください");
      const ids = value.split(",").map((id) => id.trim());
      if (ids.includes("summary"))
        throw new Error("summary の場面は廃止されました。--refresh-audio には指定できません");
      refreshAudio.push(...ids);
    } else if (a === "--tts") {
      const name = args[++i];
      if (!["gemini", "openjtalk", "fake"].includes(name))
        throw new Error("--tts は gemini・openjtalk・fake から選んでください");
      tts = name as TtsProviderName;
    } else if (a === "--tts-model") {
      const value = args[++i];
      if (!value?.trim() || value.startsWith("--"))
        throw new Error("--tts-model に音声モデルのIDを指定してください");
      ttsModel = value.trim();
    } else if (a === "--out") {
      if (!args[i + 1] || args[i + 1].startsWith("--"))
        throw new Error("--out にフォルダーを指定してください");
      out = resolve(args[++i]);
    } else if (a.startsWith("--")) throw new Error(`不明なオプション: ${a}`);
    else selectors.push(a);
  }
  if (stills && refreshAudio.length)
    throw new Error("--refresh-audio と --stills は同時に指定できません");
  return { selectors, stills, tts, ttsModel, out, refreshAudio: [...new Set(refreshAudio)] };
}
/** 壊れた復元音声は捨てて再合成する。合成そのもののエラーは呼び出し元へ返す。 */
async function cachedScenePcm(
  provider: TtsProvider,
  speech: string,
  cache: string,
  refresh: boolean,
  decode: (file: string) => Promise<Int16Array>,
): Promise<Int16Array> {
  const result = await synthesizeCached(provider, speech, cache, refresh);
  try {
    const pcm = await decode(result.file);
    if (!pcm.length) throw new Error("音声キャッシュが空です");
    touchVideoCacheFile(result.file);
    return pcm;
  } catch (error) {
    if (!result.cached) throw error;
    rmSync(result.file, { force: true });
    return cachedScenePcm(provider, speech, cache, true, decode);
  }
}
export async function sceneAudio(
  scene: Scene | TextScene,
  readings: Record<string, string>,
  provider: TtsProvider,
  cache: string,
  refresh = false,
): Promise<Int16Array[]> {
  const speeches = sceneSpeeches(scene, readings);
  const weights = speeches.map(estimateSpeechSeconds);
  if (provider.unit === "topic") {
    const speech = speeches.join("\n\n");
    let problems: string[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const pcm = await cachedScenePcm(
          provider,
          speech,
          cache,
          refresh || attempt === 1,
          decodePcm,
        ),
        split = splitNarration(pcm, AUDIO_RATE, weights);
      if (!split.ok) {
        problems = [split.reason];
        continue;
      }
      const pcms = split.segments.map((s) => trimSilence(pcm.subarray(s.start, s.end), AUDIO_RATE));
      problems = pcms.flatMap((p, i) => {
        const ratio = p.length / AUDIO_RATE / weights[i];
        return ratio < 0.4 || ratio > 2 ? [`文${i + 1}の音声の長さが推定と合いません`] : [];
      });
      if (!problems.length) return pcms;
    }
    throw new Error(`${scene.id}: 音声の分割・長さの検査に失敗しました: ${problems.join(" / ")}`);
  }
  return mapPool(speeches, provider.concurrency, async (speech, i) => {
    let pcm = await cachedScenePcm(provider, speech, cache, refresh, decodeTrimmedPcm);
    const abnormal = () => {
      const ratio = pcm.length / AUDIO_RATE / weights[i];
      return ratio < 0.4 || ratio > 2;
    };
    if (abnormal() && provider.nondeterministic)
      pcm = await cachedScenePcm(provider, speech, cache, true, decodeTrimmedPcm);
    if (abnormal()) throw new Error(`${scene.id}: 文${i + 1}の音声の長さが推定と合いません`);
    return pcm;
  });
}

function sceneGenerationCode(): Record<string, string> {
  const files = [
    "./build-scene-video.ts",
    "./lib/scene-cache.ts",
    "./lib/scene-html.ts",
    "./lib/scene-view-html.ts",
    "./lib/scene-code-html.ts",
    "../src/scene-code.ts",
    "./lib/scene-encode.ts",
    "./lib/storyboard-assets.ts",
    "./lib/ffmpeg.ts",
    "../src/storyboard-assets.ts",
    "../src/scene-layout.ts",
    "../src/scene-timeline.ts",
    "../src/scene-sfx.ts",
    "../src/scene-view.ts",
    "../src/video-storyboard.ts",
    "../src/video-art.ts",
    "../src/video-shots.ts",
    "../src/narration.ts",
    "../src/narration-split.ts",
  ];
  return {
    ...Object.fromEntries(
      files.map((file) => [file, readFileSync(new URL(file, import.meta.url), "utf8")]),
    ),
    // フォントの実体も含める。インストール先の絶対パスは含めない。
    font: (sceneFontCss + codeFontCss).replace(
      /url\(([^)]+)\)/g,
      (_match, url: string) =>
        `url(${createHash("sha256")
          .update(readFileSync(new URL(url)))
          .digest("hex")})`,
    ),
  };
}

/** 素材の検査と配信ハッシュは、ブラウザも音声合成も使わない。 */
export function planSceneTopic(
  topic: ReturnType<typeof collectNarrationTopics>[number],
  voice: string,
) {
  const json = JSON.parse(readFileSync(join(topic.topicDir, "video.json"), "utf8"));
  const assets = storyboardAssets(contentRoot, topic.topicDir, json, {
    onlyReferenced: true,
    freshVideoHashes: true,
  });
  const { storyboard, issues } = parseStoryboard(json, assets.context);
  if (!storyboard || issues.some((i) => i.message.includes("イラストがまだありません")))
    throw new Error(issues.map((i) => `${i.path}: ${i.message}`).join(" / "));
  return sceneVideoSourceHash({
    version: SCENE_GENERATOR_VERSION,
    storyboard,
    title: topic.title,
    header: topic.header,
    takeaway: topic.takeaway,
    readings: topic.readings,
    voice,
    assets: assets.hashes,
    code: sceneGenerationCode(),
  });
}

export async function buildSceneTopic(
  browser: Browser,
  options: ReturnType<typeof argumentsOf>,
  topic: ReturnType<typeof collectNarrationTopics>[number],
  provider: TtsProvider | undefined,
  onlyReferenced = false,
) {
  const file = join(topic.topicDir, "video.json");
  const json = JSON.parse(readFileSync(file, "utf8"));
  const assets = storyboardAssets(contentRoot, topic.topicDir, json, { onlyReferenced });
  const { storyboard, issues } = parseStoryboard(json, assets.context);
  for (const issue of issues)
    console.info(`${issue.level}: ${topic.stageSlug}/${topic.id}:${issue.path}: ${issue.message}`);
  if (!storyboard) throw new Error("絵コンテの検査エラーがあります");
  if (issues.some((i) => i.message.includes("イラストがまだありません")))
    throw new Error("イラストがまだありません。video:art を実行してください");
  if (!/^[\w-]+$/.test(topic.id)) throw new Error("トピックIDは英数字とハイフンにしてください");
  const boards = storyboard.boards ?? {};
  const out = join(options.out, topic.stageSlug, topic.id),
    cache = join(contentRoot, "dist/video-cache/scenes");
  mkdirSync(out, { recursive: true });
  mkdirSync(cache, { recursive: true });
  const work = mkdtempSync(join(cache, "work-"));
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  try {
    await extractClipFrames(contentRoot, work, assets);
    const page = await context.newPage();
    await page.route(
      (url) => url.protocol !== "file:",
      (route) => route.abort(),
    );
    const states = storyboardStates(storyboard);
    // Layout を先に確認する。はみ出す図のために API を呼ばない。
    const estimates = storyboard.scenes.map((s) =>
      s.beats.map((b) =>
        estimateSpeechSeconds(speechOf({ text: b.say, speech: b.speech }, topic.readings)),
      ),
    );
    let sequence = sceneVideoSequence(
      storyboard.scenes,
      estimates,
      topic,
      assets.context.clips,
      undefined,
      storyboard.schema,
    );
    const sceneBoard = (i: number) => {
      const name = sceneBoardName(storyboard.scenes[i]);
      return name === undefined ? { cols: 1, rows: 1, nodes: [] } : boards[name];
    };
    const sceneAssets = (i: number) => {
      const scene = storyboard.scenes[i];
      const refs = new Set(
        scene.kind === "view"
          ? [
              scene.image,
              ...scene.beats.flatMap((b) =>
                b.clip ? [`clip:${b.clip}`] : b.image ? [b.image] : [],
              ),
            ]
          : sceneBoard(i).nodes.flatMap((n) => (n.art ? [`art:${n.art}`] : [])),
      );
      const previous = states[i - 1];
      if (scene.kind === "view" && previous?.kind === "view") refs.add(previous.end.image);
      return {
        images: Object.fromEntries(Object.entries(assets.images).filter(([id]) => refs.has(id))),
        hashes: Object.fromEntries(Object.entries(assets.hashes).filter(([id]) => refs.has(id))),
      };
    };
    const stillOverflows = new Set<string>();
    const boundaryFrames = new Map<number, string>();
    const load = async (i: number): Promise<string> => {
      const { scene, timing, sourceIndex } = sequence[i];
      let previousFrame: string | undefined;
      if (
        storyboard.schema === 1 &&
        i > 0 &&
        scene.kind !== "text" &&
        (scene.kind === "code" || sequence[i - 1].scene.kind === "code")
      ) {
        previousFrame = boundaryFrames.get(i);
        if (!previousFrame) {
          await load(i - 1);
          await page.evaluate(
            (t) => (window as unknown as ScenePageWindow).__setTime(t),
            sequence[i - 1].timing.duration - 1 / 30,
          );
          previousFrame = `data:image/png;base64,${(await page.screenshot()).toString("base64")}`;
          boundaryFrames.set(i, previousFrame);
        }
      }
      const html =
        scene.kind === "text"
          ? textSceneHtml(scene)
          : sceneHtml({
              board: sceneBoard(sourceIndex),
              schema: storyboard.schema,
              scene,
              previousFrame,
              state: states[sourceIndex],
              images: sceneAssets(sourceIndex).images,
              previousView:
                states[sourceIndex - 1]?.kind === "view"
                  ? (states[sourceIndex - 1] as ViewSceneState)
                  : undefined,
              timing: { ...timing, start: 0 },
              index: i,
              total: sequence.length,
              previous: storyboard.scenes[sourceIndex - 1],
              fadeFromBackground: sourceIndex === 0,
            });
      const htmlFile = join(work, `scene-${i}.html`);
      writeFileSync(htmlFile, html);
      const errors: string[] = [];
      const listener = (e: Error) => errors.push(e.message);
      page.on("pageerror", listener);
      await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode())));
      const overflows: string[] = [];
      const samples = [
        0,
        ...(scene.kind === "text" ? [0.4, timing.duration - 0.4] : []),
        ...timing.beats.flatMap((b) =>
          [b.start, b.start + 0.15, b.start + 0.4, b.start + 0.8, b.end - 1 / 30].filter(
            (t) => t < b.end,
          ),
        ),
      ];
      for (const time of samples)
        overflows.push(
          ...(await page.evaluate(async (t) => {
            const win = window as unknown as ScenePageWindow;
            await win.__setTime(t);
            return win.__overflows();
          }, time)),
        );
      await page.evaluate(() => (window as unknown as ScenePageWindow).__setTime(0));
      page.off("pageerror", listener);
      if (errors.length) throw new Error(errors.join(" / "));
      if (overflows.length) {
        if (!options.stills)
          throw new Error(`文字のはみ出し: ${[...new Set(overflows)].join(" / ")}`);
        for (const message of overflows) stillOverflows.add(`${scene.id}: ${message}`);
      }
      return html;
    };
    for (let i = 0; i < sequence.length; i++) await load(i);
    if (options.stills) {
      const dir = prepareSceneStills(options.out, topic.stageSlug, topic.id);
      const frames: { file: string; label: string }[] = [];
      for (let i = 0; i < sequence.length; i++) {
        await load(i);
        const { scene, timing } = sequence[i];
        const samples =
          scene.kind === "text"
            ? [{ time: timing.duration / 2, label: scene.title }]
            : timing.beats.map((beat, j) => ({
                time: beat.end - 1 / 30,
                label: `${j + 1}　${beat.say}`,
              }));
        for (const [j, sample] of samples.entries()) {
          await page.evaluate(
            (t) => (window as unknown as ScenePageWindow).__setTime(t),
            sample.time,
          );
          const name = `scene-${i + 1}-beat-${j + 1}.png`;
          await page.screenshot({ path: join(dir, name) });
          frames.push({
            file: pathToFileURL(join(dir, name)).href,
            label: `${scene.id} · ${sample.label}`,
          });
        }
      }
      const sheet = join(work, "sheet.html");
      const safe = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
      writeFileSync(
        sheet,
        `<!doctype html><meta charset="utf-8"><style>${sceneFontCss}body{margin:0;padding:16px;background:#DDDDE2;font:500 18px/1.5 'Noto Sans JP';display:grid;grid-template-columns:repeat(3,640px);gap:16px}figure{margin:0;background:white}img{width:640px;height:360px;display:block}figcaption{padding:12px;min-height:66px}</style>${frames.map((f) => `<figure><img src="${safe(f.file)}"><figcaption>${safe(f.label)}</figcaption></figure>`).join("")}`,
      );
      await page.goto(pathToFileURL(sheet).href);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.screenshot({ path: join(dir, "contact-sheet.png"), fullPage: true });
      console.info(`${topic.stageSlug}/${topic.id}: 静止画 ${frames.length}枚 + 一覧画像`);
      if (stillOverflows.size)
        throw new Error(`文字のはみ出し:\n${[...stillOverflows].join("\n")}`);
      return;
    }
    if (!provider) throw new Error("音声プロバイダーがありません");
    const pcms: Int16Array[][] = [];
    for (const { scene } of sequence)
      pcms.push(
        await sceneAudio(
          scene,
          topic.readings,
          provider,
          join(contentRoot, "dist/video-cache/tts"),
          options.refreshAudio.includes(scene.id),
        ),
      );
    sequence = sceneVideoSequence(
      storyboard.scenes,
      sequence.flatMap(({ scene }, i) =>
        scene.kind === "text" ? [] : [pcms[i].map((p) => p.length / AUDIO_RATE)],
      ),
      topic,
      assets.context.clips,
      {
        title: pcms[0][0].length / AUDIO_RATE,
      },
      storyboard.schema,
    );
    boundaryFrames.clear();
    const code = sceneGenerationCode();
    const clips: string[] = [],
      reports: unknown[] = [];
    for (let i = 0; i < sequence.length; i++) {
      const html = await load(i);
      const { scene, timing, sourceIndex } = sequence[i];
      const previous = states[sourceIndex - 1];
      const state = scene.kind === "text" ? undefined : states[sourceIndex];
      const sfx = sceneSfxCues(
        scene,
        timing,
        previous?.kind === "view" ? previous.end.image : undefined,
        storyboard.schema,
        state,
      );
      const sourceHash = sceneCacheHash({
        schema: storyboard.schema,
        version: GENERATOR_VERSION,
        board: scene.kind === "text" ? undefined : sceneBoard(sourceIndex),
        start: state?.start,
        ...(state?.kind === "code" && state.figure ? { figureStart: state.figure.start } : {}),
        assets: scene.kind === "text" ? {} : sceneAssets(sourceIndex).hashes,
        scene,
        timing: { ...timing, start: 0 },
        html,
        assetRoot: pathToFileURL(work).href,
        voice: provider.identity,
        speeches: sceneSpeeches(scene, topic.readings),
        audio: pcms[i],
        sfx,
        code,
      });
      const destination = join(cache, sourceHash),
        clip = join(destination, "clip.mp4");
      let hit = existsSync(clip) && existsSync(join(destination, "poster.png"));
      if (hit) {
        try {
          hit =
            (await probeDuration(clip)) > 0 &&
            readFileSync(join(destination, "poster.png")).subarray(0, 8).toString("hex") ===
              "89504e470d0a1a0a";
        } catch {
          hit = false;
        }
      }
      if (!hit) {
        const wav = join(work, `audio-${i}.wav`),
          audio = join(work, `audio-${i}.m4a`);
        writeNarrationWav(
          wav,
          timing.duration,
          timing.beats.map((b, j) => ({ startSec: b.speechStart ?? b.start, pcm: pcms[i][j] })),
        );
        const sfxWav = sfx.length ? join(work, `sfx-${i}.wav`) : undefined;
        if (sfxWav)
          writeNarrationWav(
            sfxWav,
            timing.duration,
            storyboard.schema === 2
              ? [{ startSec: 0, pcm: mixSceneSfx(sfx, AUDIO_RATE, timing.duration) }]
              : sfx.map((cue) => ({
                  startSec: cue.at,
                  pcm: synthesizeSceneSfx(cue.kind, AUDIO_RATE),
                })),
          );
        await encodeNarration(wav, audio, {
          preventSilence: true,
          ...(sfxWav ? { sfxWav } : {}),
        });
        const pending = join(work, `clip-${i}.mp4`);
        const shots = await encodeScene(page, timing.duration, audio, pending, timing.fadeOut);
        await page.evaluate(
          (t) => (window as unknown as ScenePageWindow).__setTime(t),
          timing.fadeOut?.start ?? timing.duration,
        );
        const poster = join(work, `poster-${i}.png`);
        await page.screenshot({ path: poster });
        mkdirSync(destination, { recursive: true });
        renameSync(pending, clip);
        copyFileSync(poster, join(destination, "poster.png"));
        console.info(`${topic.id}/${scene.id}: 作成 (${shots}枚撮影)`);
      } else console.info(`${topic.id}/${scene.id}: cache hit`);
      touchVideoCacheFile(clip);
      touchVideoCacheFile(join(destination, "poster.png"));
      clips.push(clip);
      reports.push({
        id: scene.id,
        startSec: timing.start,
        durationSec: timing.duration,
        hash: sourceHash,
        cached: hit,
      });
      if (scene.kind !== "text" && sourceIndex === storyboard.scenes.length - 1)
        await toPosterJpeg(join(destination, "poster.png"), join(work, "poster.jpg"));
    }
    const list = join(work, "concat.txt");
    writeFileSync(list, clips.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
    const video = join(work, "video.mp4");
    await runFfmpeg([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      list,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      video,
    ]);
    const duration = sequence.reduce((n, entry) => n + entry.timing.duration, 0);
    const report = {
      generatorVersion: GENERATOR_VERSION,
      ttsIdentity: provider.identity,
      durationSec: duration,
      probedDurationSec: await probeDuration(video),
      scenes: reports,
      loudness: await measureLoudness(video),
      warnings: issues.filter((i) => i.level === "warning"),
    };
    // 検査・生成に成功した3ファイルだけを公開用の出力先へ移す。
    copyFileSync(video, join(out, "video.mp4"));
    copyFileSync(join(work, "poster.jpg"), join(out, "poster.jpg"));
    // ponytail: 字幕は焼き込み。プレイヤーで字幕を消せるようにするなら、動画ごとの印を manifest と D1 に足して cue を戻す
    writeFileSync(join(out, "captions.vtt"), "WEBVTT\n\nNOTE 字幕は動画に焼き込み済み\n\n");
    writeFileSync(join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
    console.info(`${topic.stageSlug}/${topic.id}: ${duration.toFixed(2)}秒`);
    return report;
  } finally {
    await context.close();
    rmSync(work, { recursive: true, force: true });
  }
}
export async function buildSceneVideos(args: string[]) {
  const options = argumentsOf(args);
  const topics = collectNarrationTopics(options.selectors).filter((t) =>
    existsSync(join(t.topicDir, "video.json")),
  );
  if (options.refreshAudio.length) {
    const known = new Set(
      topics.flatMap((topic) => {
        const { storyboard, issues } = parseStoryboard(
          JSON.parse(readFileSync(join(topic.topicDir, "video.json"), "utf8")),
        );
        if (!storyboard)
          throw new Error(`絵コンテの検査エラー: ${issues.map((i) => i.message).join(" / ")}`);
        return ["title", ...storyboard.scenes.map((scene) => scene.id)];
      }),
    );
    for (const id of options.refreshAudio)
      if (!known.has(id)) throw new Error(`知らない場面のid: ${id}`);
  }
  if (!topics.length) {
    console.info("video.json のあるトピックはありません");
    return;
  }
  // 素材がない場合は Chromium や TTS を準備する前に止める。
  for (const topic of topics) {
    const json = JSON.parse(readFileSync(join(topic.topicDir, "video.json"), "utf8"));
    const assets = storyboardAssets(contentRoot, topic.topicDir, json);
    const result = parseStoryboard(json, assets.context);
    if (
      !result.storyboard ||
      result.issues.some((i) => i.message.includes("イラストがまだありません"))
    )
      throw new Error(
        `${topic.stageSlug}/${topic.id}: ${result.issues.map((i) => `${i.level}: ${i.path}: ${i.message}`).join("\n")}`,
      );
  }
  // stills では provider を作らず、鍵を参照する処理も呼ばない。
  let provider: TtsProvider | undefined;
  if (!options.stills) {
    const voiceFile = JSON.parse(
      readFileSync(join(contentRoot, "narration/voice.json"), "utf8"),
    ) as { provider: TtsProviderName } & Partial<
      Record<TtsProviderName, Omit<VoiceConfig, "provider">>
    >;
    const name = options.tts ?? voiceFile.provider;
    provider = createTtsProvider({
      provider: name,
      ...voiceFile[name],
      ...(options.ttsModel ? { model: options.ttsModel } : {}),
    });
  }
  const browser = await chromium.launch(
    existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {},
  );
  try {
    for (const topic of topics)
      try {
        await buildSceneTopic(browser, options, topic, provider);
      } catch (e) {
        process.exitCode = 1;
        if (e instanceof QuotaExhaustedError) {
          console.error(
            `${topic.stageSlug}/${topic.id}: ${provider?.identity}: ${e.message}。--tts-model <別のモデル> で別のモデルを使えます`,
          );
          return;
        }
        console.error(`${topic.stageSlug}/${topic.id}: ${(e as Error).message}`);
      }
  } finally {
    await browser.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildSceneVideos(process.argv.slice(2)).catch((e) => {
    console.error((e as Error).message);
    process.exitCode = 1;
  });
}
