/** 配信する3ファイルは同じ内容ハッシュを共有する。旧版は台帳に残す。 */
import { createHash } from "node:crypto";

export const SCREEN_VIDEO_FILES = ["screen.mp4", "screen.vtt", "screen.jpg"] as const;

export function selectVideoSource(
  files: Partial<Record<(typeof SCREEN_VIDEO_FILES)[number], Uint8Array>>,
): { kind: "generated" } | { kind: "recorded"; sourceHash: string } {
  const missing = SCREEN_VIDEO_FILES.filter((name) => files[name] === undefined);
  if (missing.length === SCREEN_VIDEO_FILES.length) return { kind: "generated" };
  if (missing.length > 0) {
    throw new Error(`収録済み動画の3ファイルをそろえてください。不足: ${missing.join(", ")}`);
  }
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
export type VideoManifest = Record<string, VideoManifestEntry>;
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
