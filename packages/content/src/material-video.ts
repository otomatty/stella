/** 配信する3ファイルは同じ内容ハッシュを共有する。旧版は台帳に残す。 */
import { createHash } from "node:crypto";
import { normalizeStoryboard, type VideoStoryboard } from "./video-storyboard.js";

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

export interface VideoScene {
  /** 場面の ID。動画を作り直しても、同じ場面なら同じ値。 */
  id: string;
  /** 動画の先頭からの開始位置 (秒、小数 3 桁まで)。 */
  startSec: number;
  /** 場面の長さ (秒、小数 3 桁まで)。 */
  durationSec: number;
  /** 場面の内容のハッシュ (sha256 の先頭 16 桁)。 */
  hash: string;
}

type SceneTiming = Pick<VideoScene, "startSec" | "durationSec">;

export function videoSceneHash(definition: unknown): string {
  return createHash("sha256").update(normalizeStoryboard(definition)).digest("hex").slice(0, 16);
}

function toVideoScene(id: string, timing: SceneTiming, definition: unknown): VideoScene {
  return {
    id,
    startSec: Math.round(timing.startSec * 1000) / 1000,
    durationSec: Math.round(timing.durationSec * 1000) / 1000,
    hash: videoSceneHash(definition),
  };
}

export function storyboardVideoScenes(
  report: ReadonlyArray<SceneTiming & { id: string }>,
  storyboard: Pick<VideoStoryboard, "scenes" | "boards">,
  assetHashes: Readonly<Record<string, string>>,
): VideoScene[] {
  const byId = new Map(storyboard.scenes.map((scene) => [scene.id, scene]));
  return report.flatMap((timing) => {
    const definition = byId.get(timing.id);
    // 自動生成のタイトル画面は絵コンテに定義がない。
    if (!definition) return [];
    const board = "board" in definition ? storyboard.boards?.[definition.board] : undefined;
    const references = new Set<string>();
    if (definition.kind === "view") {
      references.add(definition.image);
      for (const beat of definition.beats) {
        if (beat.image) references.add(beat.image);
        if (beat.clip) references.add(`clip:${beat.clip}`);
      }
    }
    for (const node of board?.nodes ?? []) {
      if (node.art) references.add(`art:${node.art}`);
    }
    const assets = Object.fromEntries([...references].map((ref) => [ref, assetHashes[ref]]));
    const content = board || references.size ? { definition, board, assets } : definition;
    return [toVideoScene(timing.id, timing, content)];
  });
}

export function slideVideoScenes(
  slides: ReadonlyArray<SceneTiming & { title: string; body: string }>,
  narration: ReadonlyArray<{ cues: ReadonlyArray<{ text: string }> }>,
): VideoScene[] {
  return slides.map((slide, i) =>
    toVideoScene(`slide-${i + 1}`, slide, [
      slide.title,
      narration[i].cues.map((cue) => cue.text).join(""),
      slide.body,
    ]),
  );
}

export interface VideoManifestEntry {
  video: string;
  captions: string;
  poster: string;
  durationSec: number;
  scenes?: VideoScene[];
}
export interface VideoManifestFailure {
  stageSlug: string;
  error: string;
}
/** キーは videoManifestKey が返す `<slug>/<トピックID>`。 */
export type VideoManifest = Record<string, VideoManifestEntry | VideoManifestFailure>;

/** トピック ID はステージの中でだけ一意なので、manifest のキーにはステージを含める。 */
export const videoManifestKey = (stageSlug: string, id: string): string => `${stageSlug}/${id}`;

/** 管理者に出す理由は先頭の 1 行、最大 200 文字 (省略記号を含む)。 */
export function summarizeVideoError(reason: string): string {
  const chars = Array.from(reason.split(/\r\n|\r|\n/)[0]);
  return chars.length > 200 ? `${chars.slice(0, 199).join("")}…` : chars.join("");
}

/** 同じトピックの失敗は最初の理由を残し、同じキーに成功があれば例外にする。 */
export function mergeVideoFailure(
  existing: VideoManifest[string] | undefined,
  failure: { stageSlug: string; id: string; reason: string },
): VideoManifestFailure {
  if (existing) {
    if ("error" in existing && existing.stageSlug === failure.stageSlug) return existing;
    throw new Error(
      `レッスン ID が重複しています: ${videoManifestKey(failure.stageSlug, failure.id)}`,
    );
  }
  return { stageSlug: failure.stageSlug, error: summarizeVideoError(failure.reason) };
}

export interface VideoState {
  version: 1;
  objects: Record<string, number>;
  durations: Record<string, number>;
  scenes?: Record<string, VideoScene[]>;
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
