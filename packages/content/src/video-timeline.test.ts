import { describe, expect, it } from "vitest";

import {
  buildTimeline,
  captionSegments,
  DEFAULT_TIMING,
  framesBetween,
  timelineToChaptersVtt,
  timelineToVtt,
} from "./video-timeline.js";

const input = [
  { title: "タイトル", isTitleSlide: true, cues: [{ text: "はじめます。", audioSec: 2 }] },
  {
    title: "結論",
    isTitleSlide: false,
    cues: [
      { text: "短い。", audioSec: 0.5 },
      { text: "長めの字幕です。", audioSec: 3 },
    ],
  },
];

describe("buildTimeline", () => {
  const tl = buildTimeline(input);

  it("タイトルスライドは leadTitle から話し始め、余韻を足して次へ", () => {
    expect(tl.cues[0]).toMatchObject({ start: 1.0, end: 3.15 });
    expect(tl.slides[0]).toMatchObject({ start: 0, duration: 3.75 });
  });

  it("短い音声でも最短表示時間は確保し、字幕の間を空ける", () => {
    // スライド 2: lead 0.6 → 1 本目 (0.5s → 最短 1.5s) → gap 0.35 → 2 本目 (3 + 0.15)
    expect(tl.cues[1]).toMatchObject({ start: 4.35, end: 5.85 });
    expect(tl.cues[2]).toMatchObject({ start: 6.2, end: 9.35 });
    expect(tl.slides[1]).toMatchObject({ start: 3.75, duration: 6.2 });
    expect(tl.duration).toBe(9.95);
  });

  it("定数を変えれば時刻も変わる", () => {
    const loose = buildTimeline(input, { ...DEFAULT_TIMING, gap: 1 });
    expect(loose.duration).toBeGreaterThan(tl.duration);
  });
});

describe("VTT", () => {
  const tl = buildTimeline(input);

  it("字幕を時刻付きで並べる", () => {
    const vtt = timelineToVtt(tl);
    expect(vtt.startsWith("WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.150\nはじめます。")).toBe(true);
    expect(vtt).toContain("3\n00:00:06.200 --> 00:00:09.350\n長めの字幕です。");
  });

  it("区切りと衝突する文字を潰す", () => {
    const vtt = timelineToVtt({
      duration: 2,
      slides: [],
      cues: [{ slide: 0, index: 0, start: 0, end: 2, audioSec: 1, text: "a --> b\n\nc" }],
    });
    expect(vtt).toContain("a → b c");
  });

  it("チャプターはスライド単位", () => {
    expect(timelineToChaptersVtt(tl)).toContain("2\n00:00:03.750 --> 00:00:09.950\n結論");
  });
});

describe("framesBetween", () => {
  it("境界を丸めてから差を取るので合計がずれない", () => {
    const frames = framesBetween([0, 1.01, 2.02, 3.03], 30);
    expect(frames.reduce((a, b) => a + b, 0)).toBe(Math.round(3.03 * 30));
  });
});

describe("captionSegments", () => {
  it("字幕の有無が変わるところで割り、隙間なく覆う", () => {
    const tl = buildTimeline(input);
    const segs = captionSegments(tl);
    expect(segs[0]).toEqual({ slide: 0, cue: null, start: 0, end: 1 });
    expect(segs[1]).toEqual({ slide: 0, cue: 0, start: 1, end: 3.15 });
    for (let i = 1; i < segs.length; i++) expect(segs[i].start).toBe(segs[i - 1].end);
    expect(segs.at(-1)?.end).toBe(tl.duration);
  });
});
