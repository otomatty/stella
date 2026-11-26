import type { ClipInfo, Scene, VideoStoryboard } from "./video-storyboard.js";
import { estimateSpeechSeconds, speechOf } from "./narration.js";

export const SCENE_TIMING = {
  lead: 0.8,
  switchSpeechDelay: 0.4,
  between: 1.2,
  highlightHold: 1.5,
  tail: 1.2,
  fps: 30,
  fadeOut: 0.8,
} as const;
export const SCENE_PACING = {
  1: { between: SCENE_TIMING.between, tail: SCENE_TIMING.tail },
  2: { between: 1.6, tail: 2.4, beforeThink: 0.6, defaultThink: 6, dialogHold: 2.5 },
} as const;
type Schema = VideoStoryboard["schema"];
export interface TimedBeat {
  start: number;
  end: number;
  say: string;
  /** 文の開始で窓を切り替える場合だけ、効果音のあとに読み始める。 */
  speechStart?: number;
  speechEnd?: number;
  clip?: { start: number; end: number; speed: number };
}
export interface SceneTimeline {
  start: number;
  duration: number;
  beats: TimedBeat[];
  think?: { start: number; duration: number };
  /** 最後の絵コンテ場面だけ、通常の余韻のあとに追加する。 */
  fadeOut?: { start: number; duration: number };
}
/** 絵コンテには書かない、ビルドが追加する文字だけの場面。 */
export interface TextScene {
  kind: "text";
  id: "title";
  title: string;
  header?: string;
  duration: number;
}
export interface SceneVideoEntry {
  scene: Scene | TextScene;
  timing: SceneTimeline;
  /** 自動の場面は -1。通常の場面の状態・素材は絵コンテの添字で引く。 */
  sourceIndex: number;
}
export function sceneSpeeches(
  scene: Scene | TextScene,
  readings: Record<string, string>,
): string[] {
  // タイトルの読みも読み辞書を通す。
  const beats: { say: string; speech?: string }[] =
    scene.kind === "text" ? [{ say: scene.title }] : scene.beats;
  return beats.map((b) => speechOf({ text: b.say, speech: b.speech }, readings));
}
export function sceneVideoSequence(
  scenes: Scene[],
  durations: number[][],
  topic: { title: string; header?: string; takeaway: string; readings?: Record<string, string> },
  clips: Record<string, ClipInfo> = {},
  textDurations?: Record<TextScene["id"], number>,
  schema: Schema = 1,
): SceneVideoEntry[] {
  const title: TextScene = {
    kind: "text",
    id: "title",
    title: topic.title,
    header: topic.header,
    duration: 2.6,
  };
  const timings = sceneTimelines(scenes, durations, clips, schema);
  const textTiming = (scene: TextScene): SceneTimeline => {
    const speech =
      textDurations?.[scene.id] ??
      estimateSpeechSeconds(sceneSpeeches(scene, topic.readings ?? {})[0]);
    const lead = 0.6;
    const tail = 0.8;
    scene.duration =
      Math.ceil((Math.max(scene.duration, lead + speech + tail) - 1e-9) * SCENE_TIMING.fps) /
      SCENE_TIMING.fps;
    return {
      start: 0,
      duration: scene.duration,
      beats: [{ start: lead, end: lead + speech, say: scene.title }],
    };
  };
  const titleTiming = textTiming(title);
  const last = timings.at(-1);
  if (last) {
    last.fadeOut = { start: last.duration, duration: SCENE_TIMING.fadeOut };
    last.duration =
      Math.ceil((last.duration + SCENE_TIMING.fadeOut - 1e-9) * SCENE_TIMING.fps) /
      SCENE_TIMING.fps;
  }
  return [
    { scene: title, timing: titleTiming, sourceIndex: -1 },
    ...scenes.map((scene, i) => ({
      scene,
      timing: { ...timings[i], start: timings[i].start + title.duration },
      sourceIndex: i,
    })),
  ];
}
/** 場面内の時刻で、読み上げ中の文だけを返す。操作・強調の待ち時間には出さない。 */
export function sceneCaptionAt(timing: SceneTimeline, time: number): string {
  return (
    timing.beats.find((b) => time >= (b.speechStart ?? b.start) && time < (b.speechEnd ?? b.end))
      ?.say ?? ""
  );
}

function vttTime(seconds: number): string {
  const total = Math.round(seconds * 1000);
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor(total / 60_000) % 60;
  const secs = Math.floor(total / 1000) % 60;
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(total % 1000, 3)}`;
}

/** 字幕の表示時間。話し終わってから残す時間と、次の文までつなげる間の上限 (秒)。 */
export const CAPTION_TIMING = { hold: 1.5, bridge: 2.0 } as const;

/**
 * 絵コンテの各文の字幕。話し終わってから hold 秒残し、短い間は次の文までつなぐ。
 * 場面はまたがない。タイトルのタイムラインは渡さない。
 */
export function sceneCaptionsVtt(
  scenes: readonly { timing: SceneTimeline; onDark: readonly boolean[] }[],
): string {
  const cues = scenes
    .flatMap(({ timing, onDark }) => {
      const ordered = timing.beats
        .map((beat, index) => ({ beat, index }))
        .sort(
          (a, b) => (a.beat.speechStart ?? a.beat.start) - (b.beat.speechStart ?? b.beat.start),
        );
      const sceneEnd = timing.start + timing.duration;
      return ordered.map(({ beat, index }, order) => {
        const text = beat.say
          .replace(/[\r\n]+/g, " ")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const speechEnd = timing.start + (beat.speechEnd ?? beat.end);
        const next = ordered[order + 1]?.beat;
        const nextStart = next ? timing.start + (next.speechStart ?? next.start) : undefined;
        const cap = nextStart ?? sceneEnd;
        const connect = nextStart !== undefined && nextStart - speechEnd <= CAPTION_TIMING.bridge;
        // 上限が話し終わりより前なら、重ねず場面もまたがないようそこで止める。
        const end =
          cap < speechEnd
            ? cap
            : Math.max(speechEnd, connect ? cap : Math.min(speechEnd + CAPTION_TIMING.hold, cap));
        return {
          start: timing.start + (beat.speechStart ?? beat.start),
          end,
          text: onDark[index] ? `<c.on-dark>${text}</c>` : text,
        };
      });
    })
    .sort((a, b) => a.start - b.start);
  const blocks = cues.map(
    ({ start, end, text }, index) =>
      `${index + 1}\n${vttTime(start)} --> ${vttTime(end)}\n${text}\n\n`,
  );
  return `WEBVTT\n\n${blocks.join("")}`;
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
  schema: Schema = 1,
): SceneTimeline[] {
  const pacing = SCENE_PACING[schema === 2 ? 2 : 1];
  let offset = 0;
  let previous: string | undefined;
  return scenes.map((scene, i) => {
    let t: number = SCENE_TIMING.lead;
    let image = scene.kind === "view" ? scene.image : undefined;
    const opening = image ? viewTransition(previous, image) : 0;
    const beats = scene.beats.map((beat, j) => {
      const start = t;
      const viewBeat = scene.kind === "view" ? scene.beats[j] : undefined;
      const next = viewBeat?.clip ? `clip:${viewBeat.clip}` : (viewBeat?.image ?? image);
      // opening は lead 中の切り替えなので、文の start から動く切り替えだけを遅らせる。
      const speechStart =
        next && viewTransition(image, next) === 1
          ? start + SCENE_TIMING.switchSpeechDelay
          : undefined;
      const speechEnd = (speechStart ?? start) + durations[i][j];
      let end = speechEnd;
      let playback: TimedBeat["clip"];
      if (scene.kind === "view") {
        const b = scene.beats[j];
        if (b.spot?.length || b.label?.length || b.click)
          end = Math.max(end, speechEnd + SCENE_TIMING.highlightHold);
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
      if (schema === 2 && beat.term) end = Math.max(end, speechEnd + SCENE_TIMING.highlightHold);
      if (schema === 2 && beat.dialog) end = Math.max(end, speechEnd + SCENE_PACING[2].dialogHold);
      if (schema === 2 && typeof beat.pause === "number" && Number.isFinite(beat.pause))
        end += beat.pause;
      t = end + pacing.between;
      return {
        start,
        end,
        say: beat.say,
        ...(speechStart !== undefined ? { speechStart } : {}),
        ...(speechStart !== undefined || end > speechEnd || playback ? { speechEnd } : {}),
        ...(playback ? { clip: playback } : {}),
      };
    });
    const lastBeat = beats.at(-1);
    const think =
      schema === 2 && scene.role === "quiz" && lastBeat
        ? {
            start: lastBeat.end + SCENE_PACING[2].beforeThink,
            duration:
              scene.kind !== "motion" &&
              typeof scene.think === "number" &&
              Number.isFinite(scene.think)
                ? scene.think
                : SCENE_PACING[2].defaultThink,
          }
        : undefined;
    if (schema === 2 && lastBeat) t = think ? think.start + think.duration : lastBeat.end;
    t += pacing.tail;
    const duration = Math.ceil((t - 1e-9) * SCENE_TIMING.fps) / SCENE_TIMING.fps;
    const result = { start: offset, duration, beats, ...(think ? { think } : {}) };
    offset += duration;
    previous = image;
    return result;
  });
}
