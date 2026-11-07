/**
 * 操作説明動画の自動収録
 *
 *   bun run tutorials                 # すべて収録
 *   bun run tutorials -- create board # id の一部で絞り込み
 *   bun run tutorials -- --skip-build # ビルドを省略
 *   bun run tutorials -- --url https://xxx.workers.dev  # 既存の環境で収録（ローカル API 向けのビルドが必要）
 *   bun run tutorials -- --no-narration       # ナレーションなしで撮る
 *   bun run tutorials -- --theme dark         # 暗いテーマで撮る（既定は light）
 *   bun run tutorials -- --speed 0.8          # 操作の速さ（1 が標準。0.8 なら 2 割ゆっくり）
 *
 * 流れ: アプリをビルド → 専用 D1 の写しでローカル起動 → シナリオごとに復元 →
 *       ヘッドレス Chromium で各シナリオを AI（スクリプト）が操作 → CDP で録画 → ffmpeg で MP4 化 →
 *       public/tutorials/ に動画・サムネイル・manifest.json を書き出す
 */
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser } from "playwright";
import { launchTutorialBrowser } from "./lib/browser";
import { overlayScript } from "./lib/overlay";
import { ScreenRecorder } from "./lib/recorder";
import { Director, PARK } from "./lib/director";
import { Narrator, collectNarrationTexts, muxNarration, titleNarration } from "./lib/narration";
import type { Scenario } from "./lib/types";
import { sourceHash } from "./lib/source-hash";
import { chaptersToVtt } from "./lib/captions";
import {
  TutorialEnvironment,
  WEB_ROOT as ROOT,
  WORK_DIR,
  jwtSecret,
  mintToken,
} from "./lib/environment";

const OUT_DIR = path.join(ROOT, "public", "tutorials");
const VIEWPORT = { width: 1280, height: 800 };
const SCALE = 1.5;
const VIDEO_WIDTH = 1600;
const ACCENT = "#6470e8";

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const keepFrames = args.includes("--keep-frames");
const noNarration = args.includes("--no-narration");
const urlArg = args.includes("--url") ? args[args.indexOf("--url") + 1] : null;
if (args.includes("--url") && (!urlArg || !/^https?:\/\//.test(urlArg))) {
  throw new Error("--url には起動済みの Web の URL を指定してください");
}
const speed = parseSpeed(args);
const theme = parseTheme(args);
const filters = args.filter(
  (a, i) =>
    !a.startsWith("--") &&
    args[i - 1] !== "--url" &&
    args[i - 1] !== "--speed" &&
    args[i - 1] !== "--theme",
);

/** --speed の次の値。正の数でなければ終了する（1 が標準。0.8 なら 2 割ゆっくり） */
function parseSpeed(argv: string[]): number {
  const i = argv.indexOf("--speed");
  if (i < 0) return 1;
  const raw = argv[i + 1];
  const value = Number(raw);
  if (raw == null || !Number.isFinite(value) || value <= 0) {
    console.error("--speed には正の数を指定してください（1 が標準です。0.8 なら 2 割ゆっくり）");
    process.exit(1);
  }
  return value;
}

/** --theme の次の値。light・dark 以外は終了する（既定は light） */
function parseTheme(argv: string[]): "light" | "dark" {
  const i = argv.indexOf("--theme");
  if (i < 0) return "light";
  const value = argv[i + 1];
  if (value !== "light" && value !== "dark") {
    console.error("--theme には light か dark を指定してください（既定は light です）");
    process.exit(1);
  }
  return value;
}

function log(msg: string) {
  console.log(`\x1b[36m[tutorials]\x1b[0m ${msg}`);
}

type LoadedScenario = Scenario & { file: string };

async function loadScenarios(): Promise<LoadedScenario[]> {
  const dir = path.join(ROOT, "scripts", "tutorials", "scenarios");
  const files = (await readdir(dir)).filter((f) => /\.tsx?$/.test(f)).sort();
  const list: LoadedScenario[] = [];
  for (const f of files) {
    const mod = (await import(pathToFileURL(path.join(dir, f)).href)) as { default: Scenario };
    list.push({ ...mod.default, file: path.join(dir, f) });
  }
  return list.sort((a, b) => a.order - b.order);
}

interface ManifestEntry {
  id: string;
  title: string;
  summary: string;
  screen: string;
  order: number;
  duration: number;
  video: string;
  poster: string;
  chapters: { t: number; title: string }[];
  recordedAt: string;
  /** 収録したときの画面・シナリオのハッシュ（bun run tutorials:check で古い動画を見つける） */
  sourceHash?: string;
  /** 読み上げを付けたか（cue が 1 つでもあれば true） */
  narration: boolean;
  theme: "light" | "dark";
  captions: string;
  draft?: boolean;
}

/**
 * タイトルと字幕を先に読み上げておく。ビルドやサーバー起動と並行して進める。
 * 起動が先に失敗したときは、読み上げの失敗を未処理の拒否にしない。
 */
function startNarrationPrefetch(narrator: Narrator, scenarios: LoadedScenario[]): Promise<void> {
  log(`ナレーション: ${narrator.describe()}`);
  const pending = (async () => {
    const scripts: string[][] = [];
    for (const s of scenarios) {
      scripts.push([
        titleNarration(s.title, s.summary),
        ...collectNarrationTexts(await readFile(s.file, "utf8")),
      ]);
    }
    await narrator.prefetchScripts(scripts, {
      onProgress: (done, total) => {
        log(`ナレーションを準備しています（${done}/${total}）`);
      },
      onLog: log,
    });
    log(`ナレーションを準備しました（API へのリクエスト ${narrator.requestCount} 回）`);
  })();
  void pending.catch(() => {
    /* 終了処理または呼び出し側で扱う */
  });
  return pending;
}

async function main() {
  const scenarios = (await loadScenarios()).filter(
    (s) =>
      (!s.draft || args.includes("--include-drafts")) &&
      (!filters.length || filters.some((f) => s.id.includes(f))),
  );
  if (!scenarios.length) {
    log("該当するシナリオがありません（draft は --include-drafts で収録します）");
    return;
  }
  const narrator = noNarration ? null : Narrator.fromEnv(path.join(WORK_DIR, "_narration"));
  if (!noNarration && !narrator) {
    console.error(
      "GEMINI_API_KEY が設定されていません。ナレーションなしで撮るときは --no-narration を付けてください",
    );
    process.exit(1);
  }

  const secret = jwtSecret();
  const failures: string[] = [];
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(WORK_DIR, { recursive: true });
  // 読み上げはビルドと起動のあいだに進める。最初の収録の前に待つ。
  const narrationReady = narrator ? startNarrationPrefetch(narrator, scenarios) : Promise.resolve();

  const environment = new TutorialEnvironment();
  let browser: Browser | undefined;
  try {
    const base = urlArg ? urlArg.replace(/\/$/, "") : await environment.boot(skipBuild);
    const manifestPath = path.join(OUT_DIR, "manifest.json");
    const manifest: { tutorials: ManifestEntry[] } = existsSync(manifestPath)
      ? JSON.parse(await readFile(manifestPath, "utf8"))
      : { tutorials: [] };

    browser = await launchTutorialBrowser();
    await narrationReady;
    for (const s of scenarios) {
      log(`収録中: ${s.order}. ${s.title}`);
      if (!urlArg) await environment.reset(secret, s.seedSql);
      else if (s.seedSql?.length)
        console.warn(`警告: ${s.id} の seedSql は --url 指定時には適用しません`);
      const recordingTheme = s.theme ?? theme;
      const context = await browser.newContext({
        baseURL: base,
        viewport: VIEWPORT,
        deviceScaleFactor: SCALE,
        colorScheme: recordingTheme,
        locale: "ja-JP",
        timezoneId: "Asia/Tokyo",
      });
      const page = await context.newPage();
      await page.addInitScript(({ token }) => localStorage.setItem("stella_auth_token_v1", token), {
        token: mintToken(secret, s.freshUser ? "seed-learner2" : (s.user ?? "seed-learner")),
      });
      await page.addInitScript({
        content: `var __name = (f) => f; (${overlayScript.toString()})(${JSON.stringify({ accent: ACCENT })});`,
      });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(s.start);
      await page.waitForSelector("body", { timeout: 30_000 });
      await page.waitForTimeout(1200);
      // カーソルは一覧の行に重ならない位置から始める（ホバーでフォーカスが動かないように）
      await page.mouse.move(PARK.x, PARK.y);

      const recorder = new ScreenRecorder(page, path.join(WORK_DIR, s.id));
      const t = new Director(page, recorder, { speed, narrator });
      t.setMouse(PARK.x, PARK.y);
      t.posterFile = path.join(OUT_DIR, `${s.id}.jpg`);
      await recorder.start();
      try {
        await t.title(`使い方 ${s.order}`, s.title, s.summary);
        await s.run(t);
        await t.finish();
        await t.hideCaption();
        await t.wait(700);
      } catch (e) {
        failures.push(`${s.id}: ${(e as Error).message}`);
        console.error(e);
        await page.screenshot({ path: path.join(WORK_DIR, `${s.id}-error.png`) });
      }
      await recorder.stop();
      if (failures.some((f) => f.startsWith(`${s.id}:`))) {
        await context.close();
        continue;
      }
      const video = `${s.id}.mp4`;
      const poster = `${s.id}.jpg`;
      // サムネイルはシナリオが t.poster() で撮ったもの（字幕なし）。撮っていなければ動画から切り出す
      const videoPath = path.join(OUT_DIR, video);
      const duration = await recorder.encode(
        videoPath,
        t.posterTaken ? null : path.join(OUT_DIR, poster),
        {
          width: VIDEO_WIDTH,
          posterAt: Math.min(5.5, t.chapters[0]?.t ? t.chapters[0].t + 2 : 4),
        },
      );
      if (t.narrationCues.length) {
        await muxNarration({
          video: videoPath,
          cues: t.narrationCues,
          duration,
          workDir: recorder.workDirPath,
        });
      }
      if (t.posterTaken) {
        const full = `${path.join(OUT_DIR, poster)}.full.jpg`;
        spawnSync("ffmpeg", [
          "-y",
          "-loglevel",
          "error",
          "-i",
          full,
          "-vf",
          "scale=960:-2",
          "-q:v",
          "4",
          path.join(OUT_DIR, poster),
        ]);
        await rm(full, { force: true });
      }
      if (!keepFrames) await recorder.cleanup();
      if (errors.length) log(`  ⚠ ページでエラー: ${errors.slice(0, 3).join(" / ")}`);
      const entry: ManifestEntry = {
        id: s.id,
        title: s.title,
        summary: s.summary,
        screen: s.screen,
        order: s.order,
        duration: Math.round(duration * 10) / 10,
        video: `/tutorials/${video}`,
        poster: `/tutorials/${poster}`,
        chapters: t.chapters.map((c) => ({ t: Math.round(c.t * 10) / 10, title: c.title })),
        recordedAt: new Date().toISOString(),
        sourceHash: await sourceHash(ROOT, s.file),
        narration: t.narrationCues.length > 0,
        theme: recordingTheme,
        captions: `${s.id}.vtt`,
        draft: s.draft,
      };
      await writeFile(path.join(OUT_DIR, entry.captions), chaptersToVtt(entry.chapters, duration));
      manifest.tutorials = [...manifest.tutorials.filter((x) => x.id !== s.id), entry].sort(
        (a, b) => a.order - b.order,
      );
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
      log(
        `  ✓ ${video}（${entry.duration}秒・${entry.chapters.length}ステップ・${entry.narration ? "ナレーションあり" : "ナレーションなし"}）`,
      );
      await context.close();
    }
  } finally {
    await browser?.close().catch(() => {
      /* 終了処理または呼び出し側で扱う */
    });
    await environment.close();
  }
  if (failures.length) {
    console.error(`\n収録に失敗したシナリオ:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  log(`完了: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
