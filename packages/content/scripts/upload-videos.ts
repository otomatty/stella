/** 教材動画の差分生成 → 公開 R2 → VIDEO_MANIFEST。旧版は削除しない。
 *
 * 作る前に、Gemini TTS を実際に呼ぶ回数を数える。台帳 lesson-video/state.json の
 * ttsUsage は、この video:sync が呼んだ回数だけを足す (失敗した HTTP リクエストと
 * 再試行を含む)。手元の `--tts gemini` や、同じ API キーの別用途は数えない。
 * 1 日の区切りは太平洋時間 (Gemini の上限が戻る時刻)。必要回数が残りを超えるときは、
 * 合成も描画も R2 への書き込みも manifest も行わない。分割検査に失敗した再合成は
 * 事前の数に含めず、実行後に台帳へ足す。
 */
import { beginVideoCacheRun, pruneVideoCache } from "./lib/scene-cache.js";
import { appendFileSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildVideos,
  formatVideoFailure,
  loadVideoVoice,
  validatePublishedVideoVoice,
  videoTtsOf,
  type PendingVideoTts,
  type VideoPlan,
} from "./build-video.js";
import { createR2Client, putAll } from "./lib/r2.js";
import { topicIdsFromArgs } from "./lib/narration-topics.js";
import {
  countTtsCalls,
  createTtsProvider,
  lessonVideoTtsCacheDir,
  logVideoTts,
  readGeminiTtsCalls,
  trackGeminiTtsCalls,
  type TtsCallTopic,
} from "./lib/tts.js";
import {
  addTtsUsage,
  hasVideo,
  mergeVideoFailure,
  serializeVideoManifest,
  videoKeyHash,
  videoKeys,
  videoManifestKey,
  videoTtsAllowance,
  videoTtsDailyLimit,
  type TtsUsage,
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
  usage: TtsUsage | undefined,
  limit: number,
  now = new Date(),
): VideoTtsBudget {
  const counted = countTtsCalls(pending, identity, cacheDir);
  const allowance = videoTtsAllowance(usage, limit, now);
  return { ...allowance, limit, needed: counted.needed, topics: counted.topics };
}

export function videoTtsDecision(
  budget: VideoTtsBudget,
  dryRun: boolean,
): "run" | "dry-run" | "stop" {
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

function readVideoState(parsed: VideoState): VideoState {
  if (parsed.version !== 1 || !parsed.objects || !parsed.durations)
    throw new Error("invalid state");
  const usage = parsed.ttsUsage;
  const ttsUsage =
    usage &&
    typeof usage.day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(usage.day) &&
    Number.isInteger(usage.requests) &&
    usage.requests >= 0
      ? { day: usage.day, requests: usage.requests }
      : undefined;
  return { ...parsed, ttsUsage };
}

export function formatVideoTtsReport(
  budget: VideoTtsBudget,
  decision: "run" | "dry-run" | "stop",
): string {
  const rows = budget.topics.map(
    (topic) => `${topic.stageSlug}/${topic.id}\t${KIND_LABEL[topic.kind]}\t${topic.calls}`,
  );
  const ending =
    decision === "dry-run"
      ? "--dry-run のため、動画は作りません。"
      : decision === "stop"
        ? "上限を超えるので動画を作りません。--topics で対象を絞ってください。"
        : "上限の範囲内です。動画を作ります。";
  return [
    "教材動画の読み上げ (Gemini)",
    `日付 (太平洋時間): ${budget.day}`,
    `上限: ${budget.limit}  使用済み: ${budget.used}  残り: ${budget.remaining}  必要: ${budget.needed}`,
    "この回数は video:sync が呼ぶ Gemini だけを数えます。手元の --tts gemini や、同じ API キーの別用途は含みません。",
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

function summaryTable(budget: VideoTtsBudget, decision: "run" | "dry-run" | "stop"): string {
  const result =
    decision === "dry-run"
      ? "確認のみ (--dry-run)。何も作りません"
      : decision === "stop"
        ? "上限を超えるため中止。--topics で対象を絞ってください"
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
    "- この回数は video:sync が呼ぶ Gemini だけを数えます。手元の `--tts gemini` や、同じ API キーの別用途は含みません。",
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
  const force = args.includes("--force");
  if (force && !topicIds) throw new Error("--force は --topics を指定したときだけ使えます");
  const remote = args.includes("--remote");
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
    ...args.filter((arg) => arg !== "--remote" && arg !== "--dry-run"),
    ...(args.includes("--tts") ? [] : ["--tts", tts]),
  ];
  const voice = loadVideoVoice(videoTtsOf(buildArgs));
  const identity = createTtsProvider(voice).identity;
  const cacheDir = lessonVideoTtsCacheDir(contentRoot);
  const limit = videoTtsDailyLimit(process.env.VIDEO_TTS_DAILY_LIMIT);
  const r2 = createR2Client("stella-materials-public", remote);
  let state: VideoState = { version: 1, objects: {}, durations: {} };
  try {
    const body = await r2.get(STATE_KEY);
    if (body) state = readVideoState(JSON.parse(new TextDecoder().decode(body)) as VideoState);
  } catch {
    console.warn("動画の台帳を読めませんでした — 全件生成します");
  }
  const manifest: VideoManifest = {};
  const pending: VideoPlan[] = [];
  const seen = new Set<string>();
  let started = false;
  try {
    const { reports, failures } = await buildVideos(
      buildArgs,
      (plan) => {
        const key = videoManifestKey(plan.stageSlug, plan.id);
        if (seen.has(key)) throw new Error(`レッスン ID が重複しています: ${key}`);
        seen.add(key);
        const keys = videoKeys(plan.stageSlug, plan.id, plan.sourceHash);
        if (!force && hasVideo(state, keys)) {
          if (manifest[key]) throw new Error(`レッスン ID が重複しています: ${key}`);
          const videoHash = videoKeyHash(keys.video);
          const scenes = state.scenes?.[videoHash];
          manifest[key] = {
            ...keys,
            durationSec: state.durations[videoHash],
            ...(scenes ? { scenes } : {}),
          };
          return true;
        }
        pending.push(plan);
        return false;
      },
      async (targets) => {
        if (voice.provider !== "gemini") {
          if (dryRun) {
            console.log("--dry-run のため、動画は作りません。");
            throw new VideoSyncHalted("dry-run", true);
          }
          beginVideoCacheRun();
          started = true;
          return;
        }
        const budget = assessVideoTtsBudget(targets, identity, cacheDir, state.ttsUsage, limit);
        const decision = videoTtsDecision(budget, dryRun);
        console.log(formatVideoTtsReport(budget, decision));
        appendStepSummary(summaryTable(budget, decision));
        if (decision === "dry-run") throw new VideoSyncHalted("dry-run", true);
        if (decision === "stop") {
          throw new VideoSyncHalted(
            `Gemini の読み上げが 1 日の上限を超えるので、動画を作りません。必要 ${budget.needed} 回、残り ${budget.remaining} 回 (${budget.day}、使用済み ${budget.used} / 上限 ${budget.limit})。--topics で対象を絞ってください。`,
            false,
          );
        }
        beginVideoCacheRun();
        started = true;
        trackGeminiTtsCalls(true);
      },
    );
    for (const plan of pending) {
      const report = reports.find(
        (item) =>
          item.stageSlug === plan.stageSlug &&
          item.id === plan.id &&
          item.sourceHash === plan.sourceHash,
      );
      if (!report) continue;
      const keys = videoKeys(plan.stageSlug, plan.id, plan.sourceHash);
      const base = join(contentRoot, "dist/video", plan.stageSlug, plan.id);
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
      for (const file of files) state.objects[videoKeyHash(file.key)] = statSync(file.file).size;
      const videoHash = videoKeyHash(keys.video);
      const scenes = report.videoScenes;
      state.durations[videoHash] = report.durationSec;
      if (scenes) {
        state.scenes ??= {};
        state.scenes[videoHash] = scenes;
      }
      const key = videoManifestKey(plan.stageSlug, plan.id);
      if (manifest[key]) throw new Error(`レッスン ID が重複しています: ${key}`);
      manifest[key] = { ...keys, durationSec: report.durationSec, ...(scenes ? { scenes } : {}) };
    }
    const successCount = Object.keys(manifest).length;
    for (const failure of failures) {
      const key = videoManifestKey(failure.stageSlug, failure.id);
      manifest[key] = mergeVideoFailure(manifest[key], failure);
    }
    if (voice.provider === "gemini")
      state.ttsUsage = addTtsUsage(state.ttsUsage, readGeminiTtsCalls());
    await r2.put(STATE_KEY, new TextEncoder().encode(JSON.stringify(state)), "application/json");
    mkdirSync(dirname(manifestFile), { recursive: true });
    writeFileSync(manifestFile, serializeVideoManifest(manifest));
    console.log(`✓ video manifest: 成功 ${successCount} 件 / 失敗 ${failures.length} 件`);
    appendStepSummary(`\n- 生成: 成功 ${successCount} 件 / 失敗 ${failures.length} 件\n`);
    if (failures.length > 0) {
      console.error(`作れなかった動画: ${failures.length} 件 (前の版を残します)`);
      for (const failure of failures) console.error(`  ${formatVideoFailure(failure)}`);
      process.exitCode = 1;
    }
  } catch (error) {
    if (error instanceof VideoSyncHalted && error.dryRun) return;
    throw error;
  } finally {
    trackGeminiTtsCalls(false);
    if (started) pruneVideoCache(join(contentRoot, "dist/video-cache"));
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
