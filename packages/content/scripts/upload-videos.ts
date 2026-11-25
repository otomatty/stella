/** 教材動画の差分生成 → 公開 R2 → VIDEO_MANIFEST。旧版は削除しない。
 *
 * 作る前に、Gemini TTS を実際に呼ぶ回数を数える。台帳 lesson-video/state.json の
 * ttsUsage は、この video:sync（`--preview` を含む）が呼んだ回数だけを足す
 * (失敗した HTTP リクエストと再試行を含む)。`video:scenes` などの手元の
 * `--tts gemini` や、同じ API キーの別用途は数えない。
 * 1 日の区切りは太平洋時間 (Gemini の上限が戻る時刻)。必要回数が残りを超えるときは、
 * 合成も描画も R2 への書き込みも manifest も行わない。分割検査に失敗した再合成は
 * 事前の数に含めず、実行後に台帳へ足す。
 */
import { beginVideoCacheRun, pruneVideoCache } from "./lib/scene-cache.js";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildVideos,
  formatVideoFailure,
  loadVideoVoice,
  validatePublishedVideoVoice,
  videoOutputDir,
  videoSelectorsFromArgs,
  videoTtsOf,
  type PendingVideoTts,
  type VideoPlan,
} from "./build-video.js";
import { createR2Client, putAll, type R2Client } from "./lib/r2.js";
import { topicIdsFromArgs } from "./lib/narration-topics.js";
import {
  countTtsCalls,
  createTtsProvider,
  lessonVideoTtsCacheDir,
  logVideoTts,
  requireCachedTts,
  trackGeminiTtsCalls,
  type TtsCallTopic,
} from "./lib/tts.js";
import {
  pacificDate,
  hasVideo,
  mergeVideoFailure,
  serializeVideoManifest,
  videoKeyHash,
  videoKeys,
  videoManifestKey,
  videoTtsAllowance,
  videoTtsDailyLimit,
  type VideoManifest,
  type VideoState,
} from "../src/material-video.js";

const contentRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_KEY = "lesson-video/state.json";
const KIND_LABEL = { scene: "場面", narration: "スライド", recorded: "収録" } as const;

export interface VideoTtsBudget {
  day: string;
  limit: number;
  used: number;
  remaining: number;
  needed: number;
  topics: TtsCallTopic[];
}

export function assessVideoTtsBudget(
  pending: readonly PendingVideoTts[],
  identity: string,
  cacheDir: string,
  usage: VideoState["ttsUsage"],
  limit: number,
  now = new Date(),
): VideoTtsBudget {
  const counted = countTtsCalls(pending, identity, cacheDir);
  const day = pacificDate(now);
  const allowance = videoTtsAllowance({ day, requests: usage?.[day] ?? 0 }, limit, now);
  return { ...allowance, limit, needed: counted.needed, topics: counted.topics };
}

export function videoTtsDecision(
  budget: VideoTtsBudget,
  dryRun: boolean,
  cachedOnly = false,
): "run" | "dry-run" | "stop" | "cached-stop" {
  if (cachedOnly && budget.needed > 0) return dryRun ? "dry-run" : "cached-stop";
  if (dryRun) return "dry-run";
  if (budget.needed > budget.remaining) return "stop";
  return "run";
}

class VideoSyncHalted extends Error {
  constructor(
    message: string,
    readonly dryRun: boolean,
  ) {
    super(message);
    this.name = "VideoSyncHalted";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonnegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isDay(day: unknown): day is string {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

function isRequestCount(value: unknown): value is number {
  return isNonnegativeNumber(value) && Number.isSafeInteger(value);
}

function parseVideoState(body: Uint8Array): VideoState {
  const parsed: unknown = JSON.parse(new TextDecoder("utf8", { fatal: true }).decode(body));
  if (
    !isRecord(parsed) ||
    parsed.version !== 1 ||
    !isRecord(parsed.objects) ||
    !Object.values(parsed.objects).every(isNonnegativeNumber) ||
    !isRecord(parsed.durations) ||
    !Object.values(parsed.durations).every(isNonnegativeNumber)
  )
    throw new Error("台帳の形式が不正です");
  const { scenes, revisions, ttsUsage } = parsed;
  if (
    scenes !== undefined &&
    (!isRecord(scenes) ||
      !Object.values(scenes).every(
        (list) =>
          Array.isArray(list) &&
          list.every(
            (scene: unknown) =>
              isRecord(scene) &&
              typeof scene.id === "string" &&
              typeof scene.hash === "string" &&
              isNonnegativeNumber(scene.startSec) &&
              isNonnegativeNumber(scene.durationSec),
          ),
      ))
  )
    throw new Error("台帳の scenes が不正です");
  if (
    revisions !== undefined &&
    (!isRecord(revisions) ||
      !Object.values(revisions).every(
        (revision) => typeof revision === "string" && /^[0-9a-f-]{36}$/.test(revision),
      ))
  )
    throw new Error("台帳の revisions が不正です");
  if (ttsUsage === undefined) return parsed as unknown as VideoState;
  if (!isRecord(ttsUsage)) throw new Error("台帳の ttsUsage が不正です");
  // 旧形式は直近 1 日だけを記録していた。
  if (
    Object.keys(ttsUsage).length === 2 &&
    isDay(ttsUsage.day) &&
    isRequestCount(ttsUsage.requests)
  ) {
    return { ...parsed, ttsUsage: { [ttsUsage.day]: ttsUsage.requests } } as unknown as VideoState;
  }
  if (!Object.entries(ttsUsage).every(([day, count]) => isDay(day) && isRequestCount(count)))
    throw new Error("台帳の ttsUsage が不正です");
  return parsed as unknown as VideoState;
}

type VideoLedger = {
  objects: Record<string, number>;
  durations: Record<string, number>;
  scenes: NonNullable<VideoState["scenes"]>;
  revisions: Record<string, string>;
  ttsUsage: Record<string, number>;
};

function emptyLedger(): VideoLedger {
  return { objects: {}, durations: {}, scenes: {}, revisions: {}, ttsUsage: {} };
}

/** 読み直した台帳に、この実行が書いたキーと ttsUsage の増分だけを重ねる。 */
function applyLedger(base: VideoState, ledger: VideoLedger): VideoState {
  const next: VideoState = {
    ...base,
    objects: { ...base.objects, ...ledger.objects },
    durations: { ...base.durations, ...ledger.durations },
  };
  if (Object.keys(ledger.scenes).length > 0) next.scenes = { ...base.scenes, ...ledger.scenes };
  if (Object.keys(ledger.revisions).length > 0) {
    next.revisions = { ...base.revisions, ...ledger.revisions };
  }
  if (Object.keys(ledger.ttsUsage).length > 0) {
    next.ttsUsage = { ...base.ttsUsage };
    for (const [day, count] of Object.entries(ledger.ttsUsage)) {
      next.ttsUsage[day] = (next.ttsUsage[day] ?? 0) + count;
    }
  }
  return next;
}

async function readVideoState(r2: R2Client): Promise<VideoState> {
  try {
    const body = await r2.get(STATE_KEY);
    return body === null ? { version: 1, objects: {}, durations: {} } : parseVideoState(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`動画の台帳を読めませんでした (${STATE_KEY}): ${message}`, { cause: error });
  }
}

function videoRevisionKeys(plan: VideoPlan, revision?: string): ReturnType<typeof videoKeys> {
  const hash = revision ? `${plan.sourceHash}-${revision}` : plan.sourceHash;
  return videoKeys(plan.stageSlug, plan.id, hash);
}

const TTS_COUNT_NOTE =
  "この回数は video:sync（--preview を含む）が呼ぶ Gemini だけを数えます。video:scenes などの手元の --tts gemini や、同じ API キーの別用途は含みません。";

export function formatVideoTtsReport(
  budget: VideoTtsBudget,
  decision: "run" | "dry-run" | "stop" | "cached-stop",
  preview = false,
  cachedOnly = false,
): string {
  const rows = budget.topics.map(
    (topic) => `${topic.stageSlug}/${topic.id}\t${KIND_LABEL[topic.kind]}\t${topic.calls}`,
  );
  const needsFreshAudio = decision === "cached-stop" || (cachedOnly && budget.needed > 0);
  const ending = needsFreshAudio
    ? "音声の作り直しが要るので上げません。先に --preview で作って確かめてください。"
    : decision === "dry-run"
      ? "--dry-run のため、動画は作りません。"
      : decision === "stop"
        ? "上限を超えるので動画を作りません。--topics で対象を絞ってください。"
        : preview
          ? "確認用に作ります。R2 と manifest には書きません。"
          : "上限の範囲内です。動画を作ります。";
  return [
    "教材動画の読み上げ (Gemini)",
    `日付 (太平洋時間): ${budget.day}`,
    `上限: ${budget.limit}  使用済み: ${budget.used}  残り: ${budget.remaining}  必要: ${budget.needed}`,
    TTS_COUNT_NOTE,
    "",
    "トピック\t方式\t必要",
    ...rows,
    `合計\t\t${budget.needed}`,
    "",
    ending,
  ].join("\n");
}

function appendStepSummary(markdown: string): void {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  appendFileSync(file, markdown.endsWith("\n") ? markdown : `${markdown}\n`);
}

function summaryTable(
  budget: VideoTtsBudget,
  decision: "run" | "dry-run" | "stop" | "cached-stop",
  preview = false,
  cachedOnly = false,
): string {
  const needsFreshAudio = decision === "cached-stop" || (cachedOnly && budget.needed > 0);
  const result = needsFreshAudio
    ? "音声の作り直しが要るので上げません。先に --preview で作って確かめてください"
    : decision === "dry-run"
      ? "確認のみ (--dry-run)。何も作りません"
      : decision === "stop"
        ? "上限を超えるため中止。--topics で対象を絞ってください"
        : preview
          ? "確認用に作ります。R2 と manifest には書きません"
          : "上限の範囲内です。作成を始めます";
  const rows = budget.topics
    .map(
      (topic) => `| ${topic.stageSlug}/${topic.id} | ${KIND_LABEL[topic.kind]} | ${topic.calls} |`,
    )
    .join("\n");
  return [
    "## 教材動画",
    "",
    `- 日付 (太平洋時間): ${budget.day}`,
    `- 必要な TTS: ${budget.needed}`,
    `- 使用済み: ${budget.used} / ${budget.limit} (残り ${budget.remaining})`,
    `- 結果: ${result}`,
    `- ${TTS_COUNT_NOTE}`,
    "",
    "| トピック | 方式 | 必要な TTS |",
    "| --- | --- | --- |",
    rows || "| (なし) |  | 0 |",
    "",
  ].join("\n");
}

export async function uploadVideos(args: string[]): Promise<void> {
  validatePublishedVideoVoice(args);
  const topicIds = topicIdsFromArgs(args);
  const dryRun = args.includes("--dry-run");
  const preview = args.includes("--preview");
  const cachedOnly = args.includes("--cached-only");
  const force = args.includes("--force");
  if (preview && cachedOnly) throw new Error("--preview と --cached-only は同時に指定できません");
  if (preview && dryRun) throw new Error("--preview と --dry-run は同時に指定できません");
  if (force && !topicIds) throw new Error("--force は --topics を指定したときだけ使えます");
  if (topicIds && videoSelectorsFromArgs(args).length !== 1) {
    throw new Error("--topics には対象ステージを 1 つ指定してください");
  }
  const remote = args.includes("--remote");
  const ledger = emptyLedger();
  const tts = loadVideoVoice(videoTtsOf(args, remote)).provider;
  logVideoTts(tts);
  const manifestFile = join(contentRoot, "dist/video-manifest.json");
  // 古い manifest を誤って seed に渡さない。鍵なしでは R2 に一切触れない。
  rmSync(manifestFile, { force: true });
  if (tts === "gemini" && !process.env.GEMINI_API_KEY && !dryRun) {
    console.log("キーが無いので動画を作りません");
    return;
  }
  const buildArgs = [
    ...args.filter((arg) => !["--remote", "--dry-run", "--preview", "--cached-only"].includes(arg)),
    ...(args.includes("--tts") ? [] : ["--tts", tts]),
    ...(preview ? ["--burn-captions"] : []),
  ];
  const outDir = videoOutputDir(buildArgs);
  const voice = loadVideoVoice(videoTtsOf(buildArgs));
  const identity = createTtsProvider(voice).identity;
  const cacheDir = lessonVideoTtsCacheDir(contentRoot);
  const limit = videoTtsDailyLimit(process.env.VIDEO_TTS_DAILY_LIMIT);
  const r2 = createR2Client("stella-materials-public", remote);
  const state = await readVideoState(r2);
  const revision = force ? randomUUID() : undefined;
  const manifest: VideoManifest = {};
  const pending: VideoPlan[] = [];
  const seen = new Set<string>();
  let started = false;
  let failure: { error: unknown } | undefined;
  let successCount = 0;
  let failures: Awaited<ReturnType<typeof buildVideos>>["failures"] = [];
  try {
    let reports: Awaited<ReturnType<typeof buildVideos>>["reports"];
    ({ reports, failures } = await buildVideos(
      buildArgs,
      (plan) => {
        const key = videoManifestKey(plan.stageSlug, plan.id);
        if (seen.has(key)) throw new Error(`レッスン ID が重複しています: ${key}`);
        seen.add(key);
        const originalHash = videoKeyHash(videoRevisionKeys(plan).video);
        const keys = videoRevisionKeys(plan, state.revisions?.[originalHash]);
        if (!force && hasVideo(state, keys)) {
          if (manifest[key]) throw new Error(`レッスン ID が重複しています: ${key}`);
          const videoHash = videoKeyHash(keys.video);
          const scenes = state.scenes?.[videoHash];
          manifest[key] = {
            ...keys,
            durationSec: state.durations[videoHash],
            ...(scenes ? { scenes } : {}),
          };
          if (preview) {
            console.log(`${plan.stageSlug}/${plan.id}: 同じ内容の動画が公開済みなので作りません`);
          }
          return true;
        }
        pending.push(plan);
        if (preview) {
          const base = join(outDir, plan.stageSlug, plan.id);
          rmSync(join(base, "video.captions.mp4"), { force: true });
          rmSync(join(base, "preview-captioned.mp4"), { force: true });
        }
        return false;
      },
      async (targets) => {
        if (voice.provider === "gemini") {
          const budget = assessVideoTtsBudget(targets, identity, cacheDir, state.ttsUsage, limit);
          const decision = videoTtsDecision(budget, dryRun, cachedOnly);
          console.log(formatVideoTtsReport(budget, decision, preview, cachedOnly));
          appendStepSummary(summaryTable(budget, decision, preview, cachedOnly));
          if (decision === "stop") {
            throw new VideoSyncHalted(
              `Gemini の読み上げが 1 日の上限を超えるので、動画を作りません。必要 ${budget.needed} 回、残り ${budget.remaining} 回 (${budget.day}、使用済み ${budget.used} / 上限 ${budget.limit})。--topics で対象を絞ってください。`,
              false,
            );
          }
          if (decision === "cached-stop") {
            const names = budget.topics
              .filter((topic) => topic.calls > 0)
              .map((topic) => `${topic.stageSlug}/${topic.id}`)
              .join("、");
            throw new VideoSyncHalted(
              `音声の作り直しが要るので上げません。先に --preview で作って確かめてください。呼び出しが要るトピック: ${names}`,
              false,
            );
          }
        } else if (cachedOnly) {
          const counted = countTtsCalls(targets, identity, cacheDir);
          if (counted.needed > 0) {
            const names = counted.topics
              .filter((topic) => topic.calls > 0)
              .map((topic) => `${topic.stageSlug}/${topic.id}`)
              .join("、");
            throw new VideoSyncHalted(
              `音声の作り直しが要るので上げません。先に --preview で作って確かめてください。呼び出しが要るトピック: ${names}`,
              false,
            );
          }
        } else if (dryRun) {
          console.log("--dry-run のため、動画は作りません。");
        }
        if (dryRun) throw new VideoSyncHalted("dry-run", true);
        const output = process.env.GITHUB_OUTPUT;
        if (output && targets.some((target) => target.kind !== "recorded"))
          appendFileSync(output, "cache=true\n");
        beginVideoCacheRun();
        started = true;
        if (cachedOnly) requireCachedTts(true);
        if (voice.provider === "gemini") {
          trackGeminiTtsCalls(true, () => {
            const day = pacificDate();
            ledger.ttsUsage[day] = (ledger.ttsUsage[day] ?? 0) + 1;
          });
        }
      },
    ));
    if (preview) {
      const made: string[] = [];
      for (const plan of pending) {
        const report = reports.find(
          (item) =>
            item.stageSlug === plan.stageSlug &&
            item.id === plan.id &&
            item.sourceHash === plan.sourceHash,
        );
        if (!report) continue;
        const base = join(outDir, plan.stageSlug, plan.id);
        const burned = join(base, "video.captions.mp4");
        const legacy = join(base, "preview-captioned.mp4");
        if (existsSync(burned)) made.push(burned);
        else if (existsSync(legacy)) made.push(legacy);
        else made.push(`${join(base, "video.mp4")} （字幕を焼き込んだ版はありません）`);
      }
      if (made.length > 0) {
        console.log("確認する動画:");
        for (const file of made) console.log(`  ${file}`);
      }
      const again = args
        .filter((arg) => arg !== "--preview" && arg !== "--cached-only" && arg !== "--dry-run")
        .join(" ");
      console.log(
        `次に上げるコマンド: bun run --filter=@stella/content video:sync ${again} --cached-only`,
      );
    } else {
      for (const plan of pending) {
        const report = reports.find(
          (item) =>
            item.stageSlug === plan.stageSlug &&
            item.id === plan.id &&
            item.sourceHash === plan.sourceHash,
        );
        if (!report) continue;
        const keys = videoRevisionKeys(plan, revision);
        const base = join(outDir, plan.stageSlug, plan.id);
        const files = [
          { key: keys.video, file: join(base, "video.mp4"), contentType: "video/mp4" },
          {
            key: keys.captions,
            file: join(base, "captions.vtt"),
            contentType: "text/vtt; charset=utf-8",
          },
          { key: keys.poster, file: join(base, "poster.jpg"), contentType: "image/jpeg" },
        ];
        try {
          await putAll(r2, files, 3, { exitOnFailure: false });
        } catch (error) {
          const message = (error instanceof Error ? error.message : String(error)).split("\n")[0];
          failures.push({
            stageSlug: plan.stageSlug,
            id: plan.id,
            reason: `R2 へのアップロードに失敗しました (${message})`,
          });
          continue;
        }
        for (const file of files) ledger.objects[videoKeyHash(file.key)] = statSync(file.file).size;
        const videoHash = videoKeyHash(keys.video);
        const scenes = report.videoScenes;
        ledger.durations[videoHash] = report.durationSec;
        if (revision) {
          ledger.revisions[videoKeyHash(videoRevisionKeys(plan).video)] = revision;
        }
        if (scenes) ledger.scenes[videoHash] = scenes;
        const key = videoManifestKey(plan.stageSlug, plan.id);
        if (manifest[key]) throw new Error(`レッスン ID が重複しています: ${key}`);
        manifest[key] = { ...keys, durationSec: report.durationSec, ...(scenes ? { scenes } : {}) };
      }
      successCount = Object.keys(manifest).length;
      for (const item of failures) {
        const key = videoManifestKey(item.stageSlug, item.id);
        manifest[key] = mergeVideoFailure(manifest[key], item);
      }
    }
  } catch (error) {
    if (error instanceof VideoSyncHalted && error.dryRun) return;
    failure = { error };
  } finally {
    requireCachedTts(false);
    trackGeminiTtsCalls(false);
    if (started) {
      try {
        // ponytail: 読み直しから保存までの間の競合は残る。並行実行が増えたら R2 の条件付き put に替える。
        let latest: VideoState | undefined;
        try {
          latest = await readVideoState(r2);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const wrapped = new Error(
            `${message} 上げた動画は台帳に載っていません。同じコマンドをもう一度実行してください。`,
          );
          if (failure) console.error(failure.error);
          failure = { error: wrapped };
        }
        if (latest)
          await r2.put(
            STATE_KEY,
            new TextEncoder().encode(JSON.stringify(applyLedger(latest, ledger))),
            "application/json",
          );
      } catch (error) {
        if (failure) console.error("動画の台帳の保存にも失敗しました", error);
        else failure = { error };
      } finally {
        try {
          pruneVideoCache(join(contentRoot, "dist/video-cache"));
        } catch (error) {
          console.warn("動画のキャッシュの整理に失敗しました", error);
        }
      }
    }
  }
  if (failure) throw failure.error;
  if (preview) {
    if (failures.length > 0) {
      console.error(`作れなかった動画: ${failures.length} 件`);
      for (const item of failures) console.error(`  ${formatVideoFailure(item)}`);
      process.exitCode = 1;
    }
    return;
  }
  mkdirSync(dirname(manifestFile), { recursive: true });
  writeFileSync(manifestFile, serializeVideoManifest(manifest));
  console.log(`✓ video manifest: 成功 ${successCount} 件 / 失敗 ${failures.length} 件`);
  appendStepSummary(`\n- 生成: 成功 ${successCount} 件 / 失敗 ${failures.length} 件\n`);
  if (failures.length > 0) {
    console.error(`作れなかった動画: ${failures.length} 件 (前の版を残します)`);
    for (const item of failures) console.error(`  ${formatVideoFailure(item)}`);
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  try {
    await uploadVideos(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}
