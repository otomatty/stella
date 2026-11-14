import { createHash } from "node:crypto";
import type { SceneTimeline } from "../../src/scene-timeline.js";
import { SCENE_TIMING } from "../../src/scene-timeline.js";
import {
  normalizeStoryboard,
  type Board,
  type BoardState,
  type ViewState,
  type Scene,
} from "../../src/video-storyboard.js";
export interface SceneCacheInput<S extends Scene = Scene, T = BoardState | ViewState> {
  version: number;
  board: Board;
  start: T;
  assets?: Record<string, string>;
  scene: S;
  timing: SceneTimeline;
  /** 場面内の時刻だけを含む HTML。全体の開始時刻は描画に使わない。 */
  html: string;
  voice: string;
  audio: Int16Array[];
  code: Record<string, string>;
}
const digest = (data: string | Uint8Array): string =>
  createHash("sha256").update(data).digest("hex").slice(0, 32);
/** 先行する音声の長さの変更だけでは、この場面のキャッシュを捨てない。 */
export function sceneCacheHash(input: SceneCacheInput): string {
  return digest(
    normalizeStoryboard({
      ...input,
      timing: { ...input.timing, start: 0 },
      settings: SCENE_TIMING,
      audio: input.audio.map((p) => digest(new Uint8Array(p.buffer, p.byteOffset, p.byteLength))),
    }),
  );
}
