/** 配信する3ファイルは同じ内容ハッシュを共有する。旧版は台帳に残す。 */
import { createHash } from "node:crypto";

export const SCREEN_VIDEO_FILES = ["screen.mp4", "screen.vtt", "screen.jpg"] as const;

export function selectVideoSource(
  files: Partial<Record<(typeof SCREEN_VIDEO_FILES)[number], Uint8Array>>,
  hasNarration: boolean,
): { kind: "generated" } | { kind: "recorded"; sourceHash: string } {
  const missing = SCREEN_VIDEO_FILES.filter((name) => files[name] === undefined);
  if (missing.length === SCREEN_VIDEO_FILES.length) return { kind: "generated" };
  const errors: string[] = [];
  if (!hasNarration) errors.push("収録済みの動画には narration.json が必要です");
  if (missing.length > 0) {
    errors.push(`収録済み動画の3ファイルをそろえてください。不足: ${missing.join(", ")}`);
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));
  const hash = createHash("sha256").update("stella-screen-video-v1\0");
  for (const name of SCREEN_VIDEO_FILES) {
    const contents = files[name] as Uint8Array;
    hash.update(`${name}:${contents.byteLength}:`).update(contents);
  }
  return { kind: "recorded", sourceHash: hash.digest("hex").slice(0, 32) };
}

export interface VideoManifestEntry {
  video: string;
  captions: string;
  poster: string;
  durationSec: number;
}
export interface VideoManifestFailure {
  stageSlug: string;
  error: string;
}
export type VideoManifest = Record<string, VideoManifestEntry | VideoManifestFailure>;

/** 管理者に出す理由は先頭の 1 行、最大 200 文字 (省略記号を含む)。 */
export function summarizeVideoError(reason: string): string {
  const chars = Array.from(reason.split(/\r\n|\r|\n/)[0]);
  return chars.length > 200 ? `${chars.slice(0, 199).join("")}…` : chars.join("");
}

/** 同じトピックの失敗は最初の理由を残し、成功や別ステージとの ID 衝突は拒否する。 */
export function mergeVideoFailure(
  existing: VideoManifest[string] | undefined,
  failure: { stageSlug: string; id: string; reason: string },
): VideoManifestFailure {
  if (existing) {
    if ("error" in existing && existing.stageSlug === failure.stageSlug) return existing;
    throw new Error(`レッスン ID が重複しています: ${failure.id}`);
  }
  return { stageSlug: failure.stageSlug, error: summarizeVideoError(failure.reason) };
}

export interface VideoState {
  version: 1;
  objects: Record<string, number>;
  durations: Record<string, number>;
}
export const videoKeyHash = (key: string): string => createHash("sha256").update(key).digest("hex");

export function videoKeys(stageSlug: string, lessonId: string, hash: string) {
  const base = `lesson-video/ses/${stageSlug}/${lessonId}/${hash}`;
  return { video: `${base}.mp4`, captions: `${base}.vtt`, poster: `${base}.jpg` };
}
export function hasVideo(state: VideoState, keys: ReturnType<typeof videoKeys>): boolean {
  return (
    Object.values(keys).every((key) => state.objects[videoKeyHash(key)] > 0) &&
    Number.isFinite(state.durations[videoKeyHash(keys.video)]) &&
    state.durations[videoKeyHash(keys.video)] > 0
  );
}
export function serializeVideoManifest(manifest: VideoManifest): string {
  return `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`;
}
