/**
 * 教材動画の時刻計算 (設計書の ③ 同期)。すべての時刻は「無音を削った音声の長さ」
 * だけから決まる。字幕・チャプター・音声の配置・映像の切り替えは全部ここの値を使う
 * ので、映像と音声はずれない。
 *
 * スライド i の字幕 j について:
 *   dur_j   = max(audio_j + hold, minCue)
 *   start_0 = lead,  start_j = start_{j-1} + dur_{j-1} + gap
 *   slide_i = start_{n-1} + dur_{n-1} + tail
 */

export interface TimingConfig {
  /** 話し終わってから字幕を残す時間 (秒)。 */
  hold: number;
  /** 字幕の最短表示時間 (秒)。 */
  minCue: number;
  /** 字幕と字幕の間 (秒)。 */
  gap: number;
  /** スライドが切り替わってから話し始めるまで (秒)。 */
  lead: number;
  /** タイトルスライド (`_class: lead`) だけ長めに見せる。 */
  leadTitle: number;
  /** スライドの最後の余韻 (秒)。 */
  tail: number;
}

export const DEFAULT_TIMING: TimingConfig = {
  hold: 0.15,
  minCue: 1.5,
  gap: 0.35,
  lead: 0.6,
  leadTitle: 1.0,
  tail: 0.6,
};

export interface TimelineInputSlide {
  /** チャプター名 (スライドの見出し)。 */
  title: string;
  isTitleSlide: boolean;
  cues: { text: string; audioSec: number }[];
}

export interface TimelineCue {
  slide: number;
  index: number;
  /** 動画の頭からの秒数。音声もここから鳴る。 */
  start: number;
  /** 字幕を消す時刻 (= start + max(audio + hold, minCue))。 */
  end: number;
  audioSec: number;
  text: string;
}

export interface TimelineSlide {
  index: number;
  title: string;
  start: number;
  duration: number;
}

export interface Timeline {
  duration: number;
  slides: TimelineSlide[];
  cues: TimelineCue[];
}

/** 浮動小数の誤差を ms 単位に丸める (VTT・JSON の出力を安定させる)。 */
function ms(sec: number): number {
  return Math.round(sec * 1000) / 1000;
}

export function buildTimeline(
  slides: TimelineInputSlide[],
  cfg: TimingConfig = DEFAULT_TIMING,
): Timeline {
  const outSlides: TimelineSlide[] = [];
  const outCues: TimelineCue[] = [];
  let slideStart = 0;
  slides.forEach((slide, i) => {
    let t = slide.isTitleSlide ? cfg.leadTitle : cfg.lead;
    let lastEnd = t;
    slide.cues.forEach((cue, j) => {
      if (j > 0) t = lastEnd + cfg.gap;
      const dur = Math.max(cue.audioSec + cfg.hold, cfg.minCue);
      outCues.push({
        slide: i,
        index: j,
        start: ms(slideStart + t),
        end: ms(slideStart + t + dur),
        audioSec: ms(cue.audioSec),
        text: cue.text,
      });
      lastEnd = t + dur;
    });
    const duration = lastEnd + cfg.tail;
    outSlides.push({ index: i, title: slide.title, start: ms(slideStart), duration: ms(duration) });
    slideStart += duration;
  });
  return { duration: ms(slideStart), slides: outSlides, cues: outCues };
}

function vttTime(sec: number): string {
  const total = Math.round(sec * 1000);
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const milli = total % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(milli, 3)}`;
}

/** WebVTT の字幕。字幕中の `-->` と空行は VTT の区切りと衝突するので潰す。 */
export function timelineToVtt(timeline: Timeline): string {
  const blocks = timeline.cues.map((cue, i) => {
    const text = cue.text.replace(/-->/g, "→").replace(/\n+/g, " ").trim();
    return `${i + 1}\n${vttTime(cue.start)} --> ${vttTime(cue.end)}\n${text}`;
  });
  return `WEBVTT\n\n${blocks.join("\n\n")}\n`;
}

/** スライド単位のチャプター (WebVTT chapters)。 */
export function timelineToChaptersVtt(timeline: Timeline): string {
  const blocks = timeline.slides.map(
    (s, i) => `${i + 1}\n${vttTime(s.start)} --> ${vttTime(s.start + s.duration)}\n${s.title}`,
  );
  return `WEBVTT\n\n${blocks.join("\n\n")}\n`;
}

/**
 * 区切り時刻の列 (昇順・0 始まり・末尾 = 動画の長さ) をフレーム数の列にする。
 * 各区間を個別に丸めると誤差が積もるので、境界を丸めてから差を取る。
 */
export function framesBetween(boundaries: number[], fps: number): number[] {
  const frames = boundaries.map((t) => Math.round(t * fps));
  return frames.slice(1).map((f, i) => f - frames[i]);
}

export interface CaptionSegment {
  slide: number;
  /** 表示する字幕。字幕の無い区間 (スライド頭・字幕の間・余韻) は null。 */
  cue: number | null;
  start: number;
  end: number;
}

/**
 * 字幕を焼き込むプレビュー用: 「スライド × 字幕の有無」が変わる区間に割る。
 * 本番の動画は字幕を焼き込まない (VTT を <track> で配る) ので、確認用にだけ使う。
 */
export function captionSegments(timeline: Timeline): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  for (const slide of timeline.slides) {
    const slideEnd = ms(slide.start + slide.duration);
    let t = slide.start;
    for (const cue of timeline.cues.filter((c) => c.slide === slide.index)) {
      if (cue.start > t) segments.push({ slide: slide.index, cue: null, start: t, end: cue.start });
      segments.push({ slide: slide.index, cue: cue.index, start: cue.start, end: cue.end });
      t = cue.end;
    }
    if (slideEnd > t) segments.push({ slide: slide.index, cue: null, start: t, end: slideEnd });
  }
  return segments;
}
