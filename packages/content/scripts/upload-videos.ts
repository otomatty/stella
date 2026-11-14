/** 教材動画の差分生成 → 公開 R2 → VIDEO_MANIFEST。旧版は削除しない。 */
import { mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildVideos, loadVideoVoice, type VideoPlan } from "./build-video.js";
import { createR2Client, putAll } from "./lib/r2.js";
import {
  hasVideo,
  serializeVideoManifest,
  videoKeyHash,
  videoKeys,
  type VideoManifest,
  type VideoState,
} from "../src/material-video.js";

const contentRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_KEY = "lesson-video/state.json";

export async function uploadVideos(args: string[]): Promise<void> {
  const manifestFile = join(contentRoot, "dist/video-manifest.json");
  // 古い manifest を誤って seed に渡さない。鍵なしでは R2 に一切触れない。
  rmSync(manifestFile, { force: true });
  const tts = args.includes("--tts") ? args[args.indexOf("--tts") + 1] : loadVideoVoice().provider;
  if (tts === "gemini" && !process.env.GEMINI_API_KEY) {
    console.log("キーが無いので動画を作りません");
    return;
  }
  const r2 = createR2Client("stella-materials-public", args.includes("--remote"));
  let state: VideoState = { version: 1, objects: {}, durations: {} };
  try {
    const body = await r2.get(STATE_KEY);
    if (body) {
      const parsed = JSON.parse(new TextDecoder().decode(body)) as VideoState;
      if (parsed.version !== 1 || !parsed.objects || !parsed.durations)
        throw new Error("invalid state");
      state = parsed;
    }
  } catch {
    console.warn("動画の台帳を読めませんでした — 全件生成します");
  }
  const manifest: VideoManifest = {};
  const pending: VideoPlan[] = [];
  const seen = new Set<string>();
  const { reports, failures } = await buildVideos(
    args.filter((arg) => arg !== "--remote"),
    (plan) => {
      if (seen.has(plan.id)) throw new Error(`レッスン ID が重複しています: ${plan.id}`);
      seen.add(plan.id);
      const keys = videoKeys(plan.stageSlug, plan.id, plan.sourceHash);
      if (!hasVideo(state, keys)) {
        pending.push(plan);
        return false;
      }
      if (manifest[plan.id]) throw new Error(`レッスン ID が重複しています: ${plan.id}`);
      manifest[plan.id] = { ...keys, durationSec: state.durations[videoKeyHash(keys.video)] };
      return true;
    },
  );
  for (const plan of pending) {
    const report = reports.find(
      (r) => r.stageSlug === plan.stageSlug && r.id === plan.id && r.sourceHash === plan.sourceHash,
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
      failures.push(`${plan.stageSlug}/${plan.id}: R2 へのアップロードに失敗しました (${message})`);
      continue;
    }
    for (const f of files) state.objects[videoKeyHash(f.key)] = statSync(f.file).size;
    state.durations[videoKeyHash(keys.video)] = report.durationSec;
    if (manifest[plan.id]) throw new Error(`レッスン ID が重複しています: ${plan.id}`);
    manifest[plan.id] = { ...keys, durationSec: report.durationSec };
  }
  await r2.put(STATE_KEY, new TextEncoder().encode(JSON.stringify(state)), "application/json");
  mkdirSync(dirname(manifestFile), { recursive: true });
  writeFileSync(manifestFile, serializeVideoManifest(manifest));
  console.log(`✓ video manifest: ${Object.keys(manifest).length} 件`);
  if (failures.length > 0) {
    console.error(`作れなかった動画: ${failures.length} 件 (前の版を残します)`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exitCode = 1;
  }
}

if (import.meta.main) await uploadVideos(process.argv.slice(2));
