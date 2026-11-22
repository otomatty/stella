import { viewTransition, type SceneTimeline, type TextScene } from "./scene-timeline.js";
import { addsCodeClassification, codeSceneState } from "./scene-code.js";
import type {
  BeatState,
  Scene,
  StoryboardSceneState,
  VideoStoryboard,
} from "./video-storyboard.js";

/** 正規化済みの読み上げに足す音量。素材や乱数を使わず、毎回同じPCMを作る。 */
export const SCENE_SFX_PEAK_DBFS = -24;
export const SCENE_SFX_SECONDS = {
  switch: 0.28,
  title: 0.9,
  quiz: 0.9,
  scene: 0.45,
  term: 0.6,
  correct: 0.7,
  wrong: 0.4,
  question: 0.45,
  pop: 0.12,
  move: 0.3,
  tick: 0.05,
  timeup: 0.6,
} as const;
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
  schema: VideoStoryboard["schema"] = 1,
  state?: StoryboardSceneState,
): SceneSfxCue[] {
  if (scene.kind === "text") return [{ kind: scene.id, at: 0.1 }];
  if (schema === 1 && scene.kind !== "view") return [];
  const cues: SceneSfxCue[] = [];
  let image = scene.kind === "view" ? scene.image : undefined;
  const openingSwitch = image !== undefined && viewTransition(previousImage, image) === 1;
  if (openingSwitch) cues.push({ kind: "switch", at: 0 });
  if (schema === 2) {
    if (scene.role === "quiz") cues.push({ kind: "quiz", at: 0 });
    else if (!openingSwitch) cues.push({ kind: "scene", at: 0 });
  }
  const board =
    state?.kind === "code"
      ? state.figure
      : state?.kind === "view" || state?.kind === "motion"
        ? undefined
        : state;
  const code =
    state?.kind === "code"
      ? state
      : schema === 2 && scene.kind === "code" && scene.beats.some((beat) => beat.classify)
        ? codeSceneState(scene)
        : undefined;
  for (const [i, beat] of scene.beats.entries()) {
    const at = timing.beats[i].start;
    if (scene.kind === "view") {
      const { clip, image: nextImage } = scene.beats[i];
      const next = clip ? `clip:${clip}` : (nextImage ?? image ?? scene.image);
      const switching = viewTransition(image, next) === 1;
      image = next;
      if (switching) {
        cues.push({ kind: "switch", at });
        continue;
      }
    }
    if (schema !== 2) continue;
    const codeBeat = scene.kind === "code" ? scene.beats[i] : undefined;
    const motion =
      scene.kind === "code"
        ? codeBeat?.figure
        : scene.kind === "view" || scene.kind === "motion"
          ? undefined
          : scene.beats[i];
    const boardBeat = board?.beats[i];
    const lineBeat = state?.kind === "code" ? state.beats[i] : undefined;
    const lineCross = lineBeat?.after.visible.some(
      (line) => lineBeat.after.marks[line] === "cross" && lineBeat.before.marks[line] !== "cross",
    );
    let kind: SceneSfxKind | undefined;
    if (beat.term) kind = "term";
    else if (beat.dialog) kind = "pop";
    else if (newMark(boardBeat, "check")) kind = "correct";
    else if (newMark(boardBeat, "cross") || lineCross) kind = "wrong";
    else if (newMark(boardBeat, "question")) kind = "question";
    else if (
      newTag(boardBeat) ||
      codeBeat?.part?.note ||
      (codeBeat?.classify && code && addsCodeClassification(code.beats[i]))
    )
      kind = "pop";
    else if (motion?.travel) kind = "move";
    if (kind) cues.push({ kind, at: kind === "pop" && !beat.dialog ? at + 0.1 : at });
  }
  if (schema === 2 && timing.think) {
    const { start, duration } = timing.think;
    for (let second = 0; second < duration; second++)
      cues.push({ kind: "tick", at: start + second });
    cues.push({ kind: "timeup", at: start + duration });
  }
  return cues;
}

function newMark(beat: BeatState | undefined, kind: "check" | "cross" | "question"): boolean {
  return (
    beat?.after.visible.some(
      (id) => beat.after.marks[id] === kind && beat.before.marks[id] !== kind,
    ) ?? false
  );
}

function newTag(beat: BeatState | undefined): boolean {
  return (
    beat?.after.visible.some(
      (id) =>
        Object.hasOwn(beat.after.tags ?? {}, id) &&
        beat.after.tags?.[id] !== beat.before.tags?.[id],
    ) ?? false
  );
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
  const envelope = (t: number, length: number, decay: number, attack = 0.012, release = 0.06) =>
    t < 0 ? 0 : smooth(t / attack) * Math.exp(-t / decay) * smooth((length - t) / release);
  const sine = (hz: number, t: number) => Math.sin(2 * Math.PI * hz * t);
  // smoothstep の積分で、周波数を変えても位相を連続にする。
  const glide = (from: number, to: number, t: number, length: number) => {
    const u = t / length;
    return 2 * Math.PI * (from * t + (to - from) * length * (u ** 3 - 0.5 * u ** 4));
  };
  const sequence = (hz: number[], t: number, interval: number) =>
    hz.reduce((sum, pitch, index) => {
      const local = t - index * interval;
      return sum + sine(pitch, local) * envelope(local, duration - index * interval, 0.11);
    }, 0);
  const lessonSample = (kind: Exclude<SceneSfxKind, "switch" | "title">, t: number) => {
    switch (kind) {
      case "quiz":
        return sequence([523, 659, 784], t, 0.16);
      case "scene":
        return (
          (sine(440, t) + 0.25 * sine(1760, t) * Math.exp(-t / 0.03)) *
          envelope(t, duration, 0.09, 0.004)
        );
      case "term":
        return (sine(660, t) + 0.55 * sine(990, t)) * envelope(t, duration, 0.17);
      case "correct":
        return sequence([660, 880], t, 0.15);
      case "wrong":
        return sequence([220, 196], t, 0.13);
      case "question": {
        const rise = 0.22;
        const phase =
          glide(520, 700, Math.min(t, rise), rise) + 2 * Math.PI * 700 * Math.max(0, t - rise);
        return Math.sin(phase) * envelope(t, duration, 0.19);
      }
      case "pop":
        return Math.sin(glide(1040, 820, t, duration)) * envelope(t, duration, 0.035, 0.008, 0.025);
      case "move": {
        const turn = duration / 2;
        const phase =
          t < turn
            ? glide(500, 800, t, turn)
            : glide(500, 800, turn, turn) + glide(800, 600, t - turn, turn);
        return Math.sin(phase) * envelope(t, duration, 0.13, 0.025);
      }
      case "tick":
        return sine(1200, t) * envelope(t, duration, 0.012, 0.01, 0.02);
      case "timeup":
        return (sine(784, t) + 0.4 * sine(1176, t)) * envelope(t, duration, 0.2, 0.025);
    }
  };
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
      samples[i] = lessonSample(kind, t);
    }
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const limit = 32768 * 10 ** (SCENE_SFX_PEAK_DBFS / 20);
  const target = kind === "switch" || kind === "title" ? limit : Math.floor(limit);
  const gain = peak ? target / peak : 0;
  return Int16Array.from(samples, (value) => Math.round(value * gain));
}

/** 場面の頭の音と最初の文の音が重なっても、両方を効果音トラックに残す。 */
export function mixSceneSfx(cues: SceneSfxCue[], sampleRate: number, duration: number): Int16Array {
  const mix = new Int32Array(Math.ceil(duration * sampleRate));
  for (const { kind, at } of cues) {
    const pcm = synthesizeSceneSfx(kind, sampleRate);
    const offset = Math.round(at * sampleRate);
    const length = Math.min(pcm.length, mix.length - offset);
    for (let i = 0; i < length; i++) mix[offset + i] += pcm[i];
  }
  return Int16Array.from(mix, (sample) => Math.max(-32768, Math.min(32767, sample)));
}
