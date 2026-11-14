import { storyboardAssets } from "./lib/storyboard-assets.js";
/** 場面ごとの動画。既存のスライド動画の生成・配信には接続しない。 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import { estimateSpeechSeconds, speechOf } from "../src/narration.js";
import { splitNarration, trimSilence } from "../src/narration-split.js";
import { sceneTimelines, sceneVtt } from "../src/scene-timeline.js";
import {
  parseStoryboard,
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
import { sceneCacheHash } from "./lib/scene-cache.js";
import { sceneHtml, sceneFontCss, type ScenePageWindow } from "./lib/scene-html.js";
import { encodeScene, runFfmpeg } from "./lib/scene-encode.js";
import {
  createTtsProvider,
  mapPool,
  synthesizeCached,
  type TtsProvider,
  type TtsProviderName,
  type VoiceConfig,
} from "./lib/tts.js";

const GENERATOR_VERSION = 1;
export function argumentsOf(args: string[]) {
  const selectors: string[] = [];
  const refreshAudio: string[] = [];
  let stills = false,
    tts: TtsProviderName | undefined,
    out = join(contentRoot, "dist/video");
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--") continue;
    if (a === "--stills") stills = true;
    else if (a === "--refresh-audio") {
      const value = args[++i];
      if (!value || value.startsWith("--") || value.split(",").some((id) => !id.trim()))
        throw new Error("--refresh-audio にカンマ区切りの場面のidを指定してください");
      refreshAudio.push(...value.split(",").map((id) => id.trim()));
    } else if (a === "--tts") {
      const name = args[++i];
      if (!["gemini", "openjtalk", "fake"].includes(name))
        throw new Error("--tts は gemini・openjtalk・fake から選んでください");
      tts = name as TtsProviderName;
    } else if (a === "--out") {
      if (!args[i + 1] || args[i + 1].startsWith("--"))
        throw new Error("--out にフォルダーを指定してください");
      out = resolve(args[++i]);
    } else if (a.startsWith("--")) throw new Error(`不明なオプション: ${a}`);
    else selectors.push(a);
  }
  if (stills && refreshAudio.length)
    throw new Error("--refresh-audio と --stills は同時に指定できません");
  return { selectors, stills, tts, out, refreshAudio: [...new Set(refreshAudio)] };
}
export async function sceneAudio(
  scene: Scene,
  readings: Record<string, string>,
  provider: TtsProvider,
  cache: string,
  refresh = false,
): Promise<Int16Array[]> {
  const speeches = scene.beats.map((b) => speechOf({ text: b.say, speech: b.speech }, readings));
  const weights = speeches.map(estimateSpeechSeconds);
  if (provider.unit === "topic") {
    const speech = speeches.join("\n\n");
    let problems: string[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const { file } = await synthesizeCached(provider, speech, cache, refresh || attempt === 1);
      const pcm = await decodePcm(file),
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
    let pcm = await decodeTrimmedPcm(
      (await synthesizeCached(provider, speech, cache, refresh)).file,
    );
    const abnormal = () => {
      const ratio = pcm.length / AUDIO_RATE / weights[i];
      return ratio < 0.4 || ratio > 2;
    };
    if (abnormal() && provider.nondeterministic)
      pcm = await decodeTrimmedPcm((await synthesizeCached(provider, speech, cache, true)).file);
    if (abnormal()) throw new Error(`${scene.id}: 文${i + 1}の音声の長さが推定と合いません`);
    return pcm;
  });
}
async function build(
  browser: Browser,
  options: ReturnType<typeof argumentsOf>,
  topic: ReturnType<typeof collectNarrationTopics>[number],
  provider: TtsProvider | undefined,
) {
  const file = join(topic.topicDir, "video.json");
  const json = JSON.parse(readFileSync(file, "utf8"));
  const assets = storyboardAssets(contentRoot, topic.topicDir, json);
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
    let timelines = sceneTimelines(storyboard.scenes, estimates);
    const sceneAssets = (i: number) => {
      const scene = storyboard.scenes[i];
      const refs = new Set(
        scene.kind === "view"
          ? [scene.image, ...scene.beats.flatMap((b) => (b.image ? [b.image] : []))]
          : boards[scene.board].nodes.flatMap((n) => (n.art ? [`art:${n.art}`] : [])),
      );
      const previous = states[i - 1];
      if (scene.kind === "view" && previous?.kind === "view") refs.add(previous.end.image);
      return {
        images: Object.fromEntries(Object.entries(assets.images).filter(([id]) => refs.has(id))),
        hashes: Object.fromEntries(Object.entries(assets.hashes).filter(([id]) => refs.has(id))),
      };
    };
    const stillOverflows = new Set<string>();
    const load = async (i: number) => {
      const scene = storyboard.scenes[i];
      const html = sceneHtml({
        board: scene.kind === "view" ? { cols: 1, rows: 1, nodes: [] } : boards[scene.board],
        scene,
        state: states[i],
        images: sceneAssets(i).images,
        previousView:
          states[i - 1]?.kind === "view" ? (states[i - 1] as ViewSceneState) : undefined,
        timing: { ...timelines[i], start: 0 },
        index: i,
        total: storyboard.scenes.length,
        previous: storyboard.scenes[i - 1],
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
        ...timelines[i].beats.flatMap((b) =>
          [b.start + 0.15, b.start + 0.4, b.start + 0.8, b.end - 1 / 30].filter((t) => t < b.end),
        ),
      ];
      for (const time of samples)
        overflows.push(
          ...(await page.evaluate((t) => {
            const win = window as unknown as ScenePageWindow;
            win.__setTime(t);
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
    for (let i = 0; i < storyboard.scenes.length; i++) await load(i);
    if (options.stills) {
      const dir = join(out, "stills");
      mkdirSync(dir, { recursive: true });
      const frames: { file: string; label: string }[] = [];
      for (let i = 0; i < storyboard.scenes.length; i++) {
        await load(i);
        for (let j = 0; j < timelines[i].beats.length; j++) {
          const beat = timelines[i].beats[j],
            scene = storyboard.scenes[i];
          await page.evaluate(
            (t) => (window as unknown as ScenePageWindow).__setTime(t),
            beat.end - 1 / 30,
          );
          const name = `scene-${i + 1}-beat-${j + 1}.png`;
          await page.screenshot({ path: join(dir, name) });
          frames.push({
            file: pathToFileURL(join(dir, name)).href,
            label: `${scene.id} · ${j + 1}　${beat.say}`,
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
    for (const scene of storyboard.scenes)
      pcms.push(
        await sceneAudio(
          scene,
          topic.readings,
          provider,
          join(contentRoot, "dist/video-cache/tts"),
          options.refreshAudio.includes(scene.id),
        ),
      );
    timelines = sceneTimelines(
      storyboard.scenes,
      pcms.map((ps) => ps.map((p) => p.length / AUDIO_RATE)),
    );
    const clips: string[] = [],
      reports: unknown[] = [];
    for (let i = 0; i < storyboard.scenes.length; i++) {
      const html = await load(i),
        scene = storyboard.scenes[i],
        timing = timelines[i];
      const sourceHash = sceneCacheHash({
        version: GENERATOR_VERSION,
        board: scene.kind === "view" ? { cols: 1, rows: 1, nodes: [] } : boards[scene.board],
        start: states[i].start,
        assets: sceneAssets(i).hashes,
        scene,
        timing: { ...timing, start: 0 },
        html,
        voice: provider.identity,
        audio: pcms[i],
        code: {
          renderer: readFileSync(new URL("./lib/scene-html.ts", import.meta.url), "utf8"),
          layout: readFileSync(new URL("../src/scene-layout.ts", import.meta.url), "utf8"),
          encoder: readFileSync(new URL("./lib/scene-encode.ts", import.meta.url), "utf8"),
        },
      });
      const destination = join(cache, sourceHash),
        clip = join(destination, "clip.mp4");
      const hit = existsSync(clip) && existsSync(join(destination, "poster.png"));
      if (!hit) {
        const wav = join(work, `audio-${i}.wav`),
          audio = join(work, `audio-${i}.m4a`);
        writeNarrationWav(
          wav,
          timing.duration,
          timing.beats.map((b, j) => ({ startSec: b.start, pcm: pcms[i][j] })),
        );
        await encodeNarration(wav, audio);
        const pending = join(work, `clip-${i}.mp4`);
        const shots = await encodeScene(page, timing.duration, audio, pending);
        await page.evaluate(
          (t) => (window as unknown as ScenePageWindow).__setTime(t),
          timing.duration,
        );
        const poster = join(work, `poster-${i}.png`);
        await page.screenshot({ path: poster });
        mkdirSync(destination, { recursive: true });
        renameSync(pending, clip);
        copyFileSync(poster, join(destination, "poster.png"));
        console.info(`${topic.id}/${scene.id}: 作成 (${shots}枚撮影)`);
      } else console.info(`${topic.id}/${scene.id}: cache hit`);
      clips.push(clip);
      reports.push({
        id: scene.id,
        startSec: timing.start,
        durationSec: timing.duration,
        hash: sourceHash,
        cached: hit,
      });
      if (i === storyboard.scenes.length - 1)
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
    const duration = timelines.reduce((n, t) => n + t.duration, 0);
    const report = {
      generatorVersion: GENERATOR_VERSION,
      durationSec: duration,
      probedDurationSec: await probeDuration(video),
      scenes: reports,
      loudness: await measureLoudness(video),
      warnings: issues.filter((i) => i.level === "warning"),
    };
    // 検査・生成に成功した3ファイルだけを公開用の出力先へ移す。
    copyFileSync(video, join(out, "video.mp4"));
    copyFileSync(join(work, "poster.jpg"), join(out, "poster.jpg"));
    writeFileSync(join(out, "captions.vtt"), sceneVtt(timelines));
    writeFileSync(join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
    console.info(`${topic.stageSlug}/${topic.id}: ${duration.toFixed(2)}秒`);
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
        return storyboard.scenes.map((scene) => scene.id);
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
    provider = createTtsProvider({ provider: name, ...voiceFile[name] });
  }
  const browser = await chromium.launch(
    existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {},
  );
  try {
    for (const topic of topics)
      try {
        await build(browser, options, topic, provider);
      } catch (e) {
        console.error(`${topic.stageSlug}/${topic.id}: ${(e as Error).message}`);
        process.exitCode = 1;
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
