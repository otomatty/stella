import { viewTransition, type SceneTimeline, type TextScene } from "./scene-timeline.js";
import type { Scene } from "./video-storyboard.js";

/** 正規化済みの読み上げに足す音量。素材や乱数を使わず、毎回同じPCMを作る。 */
export const SCENE_SFX_PEAK_DBFS = -24;
export const SCENE_SFX_SECONDS = { switch: 0.28, title: 0.9, summary: 1.1 } as const;
export type SceneSfxKind = keyof typeof SCENE_SFX_SECONDS;
export interface SceneSfxCue {
  kind: SceneSfxKind;
  at: number;
}

/** 時刻は場面内。クリック・キー操作・同じアプリ内のクロスフェードには音を付けない。 */
export function sceneSfxCues(
  scene: Scene | TextScene,
  timing: SceneTimeline,
  previousImage?: string,
): SceneSfxCue[] {
  if (scene.kind === "text") return [{ kind: scene.id, at: 0.1 }];
  if (scene.kind !== "view") return [];
  const cues: SceneSfxCue[] = [];
  let image = scene.image;
  if (viewTransition(previousImage, image) === 1) cues.push({ kind: "switch", at: 0 });
  for (const [i, beat] of scene.beats.entries()) {
    const next = beat.clip ? `clip:${beat.clip}` : (beat.image ?? image);
    if (viewTransition(image, next) === 1) cues.push({ kind: "switch", at: timing.beats[i].start });
    image = next;
  }
  return cues;
}

/** mono 16bit。各音のピークをそろえ、立ち上がりと末尾を滑らかにする。 */
export function synthesizeSceneSfx(kind: SceneSfxKind, sampleRate: number): Int16Array {
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) throw new Error("不正なサンプルレート");
  const duration = SCENE_SFX_SECONDS[kind];
  const samples = new Float64Array(Math.round(duration * sampleRate));
  const smooth = (value: number) => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  const envelope = (t: number, length: number, decay: number, attack = 0.012) =>
    t < 0 ? 0 : smooth(t / attack) * Math.exp(-t / decay) * smooth((length - t) / 0.06);
  const sine = (hz: number, t: number) => Math.sin(2 * Math.PI * hz * t);
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    if (kind === "switch") {
      const u = t / duration;
      // 周波数440→660Hzのsmoothstepを積分し、位相を連続にする。
      const phase = 440 * t + 220 * duration * (u ** 3 - 0.5 * u ** 4);
      samples[i] = Math.sin(2 * Math.PI * phase) * envelope(t, duration, 0.075, 0.025);
    } else if (kind === "title") {
      samples[i] = (sine(880, t) + 0.5 * sine(1320, t)) * envelope(t, duration, 0.23);
    } else {
      samples[i] =
        sine(660, t) * envelope(t, duration, 0.28) +
        0.7 * sine(880, t - 0.18) * envelope(t - 0.18, duration - 0.18, 0.26);
    }
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const gain = peak ? (32768 * 10 ** (SCENE_SFX_PEAK_DBFS / 20)) / peak : 0;
  return Int16Array.from(samples, (value) => Math.round(value * gain));
}
