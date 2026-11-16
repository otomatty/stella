import type { ClipInfo, Scene } from "./video-storyboard.js";

export const SCENE_TIMING = {
  lead: 0.8,
  between: 0.9,
  tail: 1.2,
  finalTail: 2.0,
  fps: 30,
} as const;
export interface TimedBeat {
  start: number;
  end: number;
  say: string;
  speechEnd?: number;
  clip?: { start: number; end: number; speed: number };
}
export interface SceneTimeline {
  start: number;
  duration: number;
  beats: TimedBeat[];
}
/** 別アプリの窓は入れ替え、それ以外はクロスフェード。 */
export function viewTransition(from: string | undefined, to: string): number {
  if (!from || from === to) return 0;
  const group = (s: string) => /^(?:shot|clip):(web|vscode)\//.exec(s)?.[1];
  return group(from) && group(to) && group(from) !== group(to) ? 1 : 0.4;
}
/** フレーム境界へ丸め、連結のたびに端数が蓄積しないようにする。 */
export function sceneTimelines(
  scenes: Scene[],
  durations: number[][],
  clips: Record<string, ClipInfo> = {},
): SceneTimeline[] {
  let offset = 0;
  let previous: string | undefined;
  return scenes.map((scene, i) => {
    let t: number = SCENE_TIMING.lead;
    let image = scene.kind === "view" ? scene.image : undefined;
    const opening = image ? viewTransition(previous, image) : 0;
    const beats = scene.beats.map((beat, j) => {
      const start = t;
      const speechEnd = start + durations[i][j];
      let end = speechEnd;
      let playback: TimedBeat["clip"];
      if (scene.kind === "view") {
        const b = scene.beats[j];
        const next = b.clip ? `clip:${b.clip}` : (b.image ?? image);
        if (b.clip) {
          const [id, mark] = b.clip.split("#");
          const range = clips[id]?.marks[mark];
          if (range && range[1] > range[0]) {
            const clipStart = Math.max(
              start + viewTransition(image, next as string),
              j === 0 ? opening : 0,
            );
            playback = {
              speed: b.speed ?? 1,
              start: clipStart,
              end: clipStart + (range[1] - range[0]) / (b.speed ?? 1),
            };
            end = Math.max(end, playback.end + 0.6);
          }
        }
        image = next;
      }
      t = end + SCENE_TIMING.between;
      return { start, end, say: beat.say, ...(playback ? { speechEnd, clip: playback } : {}) };
    });
    t += i === scenes.length - 1 ? SCENE_TIMING.finalTail : SCENE_TIMING.tail;
    const duration = Math.ceil((t - 1e-9) * SCENE_TIMING.fps) / SCENE_TIMING.fps;
    const result = { start: offset, duration, beats };
    offset += duration;
    previous = image;
    return result;
  });
}
export function sceneVtt(timelines: SceneTimeline[]): string {
  const stamp = (s: number) => {
    const ms = Math.round(s * 1000);
    return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
  };
  let cue = 0;
  return `WEBVTT\n\n${timelines.flatMap((s) => s.beats.map((b) => `${++cue}\n${stamp(s.start + b.start)} --> ${stamp(s.start + (b.speechEnd ?? b.end))}\n${b.say.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}\n`)).join("\n")}`;
}
