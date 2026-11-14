import type { Scene } from "./video-storyboard.js";

export const SCENE_TIMING = {
  lead: 0.5,
  between: 0.35,
  tail: 0.7,
  finalTail: 1.5,
  fps: 30,
} as const;
export interface TimedBeat {
  start: number;
  end: number;
  say: string;
}
export interface SceneTimeline {
  start: number;
  duration: number;
  beats: TimedBeat[];
}
/** フレーム境界へ丸め、連結のたびに端数が蓄積しないようにする。 */
export function sceneTimelines(scenes: Scene[], durations: number[][]): SceneTimeline[] {
  let offset = 0;
  return scenes.map((scene, i) => {
    let t: number = SCENE_TIMING.lead;
    const beats = scene.beats.map((beat, j) => {
      const start = t;
      const end = start + durations[i][j];
      t = end + SCENE_TIMING.between;
      return { start, end, say: beat.say };
    });
    t += i === scenes.length - 1 ? SCENE_TIMING.finalTail : SCENE_TIMING.tail;
    const duration = Math.ceil((t - 1e-9) * SCENE_TIMING.fps) / SCENE_TIMING.fps;
    const result = { start: offset, duration, beats };
    offset += duration;
    return result;
  });
}
export function sceneVtt(timelines: SceneTimeline[]): string {
  const stamp = (s: number) => {
    const ms = Math.round(s * 1000);
    return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
  };
  let cue = 0;
  return `WEBVTT\n\n${timelines.flatMap((s) => s.beats.map((b) => `${++cue}\n${stamp(s.start + b.start)} --> ${stamp(s.start + b.end)}\n${b.say.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}\n`)).join("\n")}`;
}
