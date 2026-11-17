import type { CodeState } from "../../src/scene-code.js";
import { existsSync, readdirSync, rmSync, statSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { speechOf } from "../../src/narration.js";
import { createHash } from "node:crypto";
import type { SceneTimeline, TextScene } from "../../src/scene-timeline.js";
import { SCENE_TIMING } from "../../src/scene-timeline.js";
import type { SceneSfxCue } from "../../src/scene-sfx.js";
import {
  normalizeStoryboard,
  type Board,
  type BoardState,
  type ViewState,
  type Scene,
} from "../../src/video-storyboard.js";
export interface SceneCacheInput<
  S extends Scene | TextScene = Scene | TextScene,
  T = BoardState | ViewState | CodeState,
> {
  version: number;
  board: S extends TextScene ? undefined : Board;
  start: S extends TextScene ? undefined : T;
  /** 使う画像・クリップ定義と動画全体の sha256。ファイルの時刻・サイズは使わない。 */
  assets?: Record<string, string>;
  scene: S;
  timing: SceneTimeline;
  /** 場面内の時刻だけを含む HTML。全体の開始時刻は描画に使わない。 */
  html: string;
  /** 抽出したコマの一時URL。作業フォルダーの違いはキャッシュを変えない。 */
  assetRoot?: string;
  voice: string;
  speeches: string[];
  audio: Int16Array[];
  sfx: SceneSfxCue[];
  code: Record<string, string>;
}
const digest = (data: string | Uint8Array): string =>
  createHash("sha256").update(data).digest("hex").slice(0, 32);
/** 先行する音声の長さの変更だけでは、この場面のキャッシュを捨てない。 */
export function sceneCacheHash(input: SceneCacheInput): string {
  return digest(
    normalizeStoryboard({
      ...input,
      assetRoot: undefined,
      html: input.assetRoot
        ? input.html.replaceAll(input.assetRoot, "file:///__scene_work__")
        : input.html,
      timing: { ...input.timing, start: 0 },
      settings: SCENE_TIMING,
      audio: input.audio.map((p) => digest(new Uint8Array(p.buffer, p.byteOffset, p.byteLength))),
    }),
  );
}

/** 合成前の配信ハッシュ。執筆メモと未使用の読み辞書は映像に影響しない。 */
export function sceneVideoSourceHash(input: {
  version: number;
  storyboard: import("../../src/video-storyboard.js").VideoStoryboard;
  title: string;
  header?: string;
  takeaway: string;
  readings: Record<string, string>;
  voice: string;
  assets: Record<string, string>;
  code: Record<string, string>;
}): string {
  const { storyboard, readings, ...rest } = input;
  return digest(
    normalizeStoryboard({
      ...rest,
      boards: storyboard.boards,
      scenes: storyboard.scenes,
      art: Object.fromEntries(
        Object.entries(storyboard.art ?? {}).map(([id, art]) => [id, { regions: art.regions }]),
      ),
      speeches: [
        [speechOf({ text: input.title }, readings)],
        ...storyboard.scenes.map((s) =>
          s.beats.map((b) => speechOf({ text: b.say, speech: b.speech }, readings)),
        ),
        [speechOf({ text: input.takeaway.trim() }, readings)],
      ],
      timing: SCENE_TIMING,
    }),
  );
}

const usedCacheFiles = new Set<string>();
export function beginVideoCacheRun(): void {
  usedCacheFiles.clear();
}
export function touchVideoCacheFile(file: string): void {
  usedCacheFiles.add(file);
  const now = new Date();
  if (existsSync(file)) utimesSync(file, now, now);
}
/** 30日ちょうどまでは残す。今回使ったファイルは時刻にかかわらず残す。 */
export function shouldPruneVideoCache(used: boolean, mtimeMs: number, nowMs: number): boolean {
  return !used && nowMs - mtimeMs > 30 * 24 * 60 * 60 * 1000;
}
export function pruneVideoCache(root: string, nowMs = Date.now()): void {
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const file = join(root, entry.name);
    if (entry.isDirectory()) {
      pruneVideoCache(file, nowMs);
      if (!readdirSync(file).length) rmSync(file, { recursive: true });
    } else if (
      /\.(mp4|png|wav|mp3)$/.test(entry.name) &&
      shouldPruneVideoCache(usedCacheFiles.has(file), statSync(file).mtimeMs, nowMs)
    ) {
      rmSync(file);
    }
  }
}
