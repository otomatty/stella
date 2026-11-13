import { describe, expect, it } from "vitest";

import { splitNarration, trimSilence } from "./narration-split.js";

const rate = 48_000;
// 正数は正弦波、負数は無音の秒数。
function audio(...parts: number[]): Int16Array {
  const pcm = new Int16Array(Math.round(parts.reduce((n, s) => n + Math.abs(s), 0) * rate));
  let offset = 0;
  for (const seconds of parts) {
    const length = Math.round(Math.abs(seconds) * rate);
    if (seconds > 0) {
      for (let i = 0; i < length; i++) {
        pcm[offset + i] = Math.round(8000 * Math.sin((2 * Math.PI * 440 * i) / rate));
      }
    }
    offset += length;
  }
  return pcm;
}

describe("splitNarration", () => {
  it("段落間の無音の中点で N 個に分け、両端の無音も含める", () => {
    const pcm = audio(-0.3, 2, -1, 3, -1, 2, -0.4);
    const result = splitNarration(pcm, rate, [2, 3, 2]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.segments).toHaveLength(3);
    expect(result.segments[0].start).toBe(0);
    expect(result.segments[0].end / rate).toBeCloseTo(2.8, 2);
    expect(result.segments[1].start).toBe(result.segments[0].end);
    expect(result.segments[1].end / rate).toBeCloseTo(6.8, 2);
    expect(result.segments[2]).toEqual({ start: result.segments[1].end, end: pcm.length });
  });

  it("期待位置に近い 0.2 秒より、少し遠い 1 秒の間を選ぶ", () => {
    const result = splitNarration(audio(2, -0.2, 0.4, -1, 2), rate, [2.1, 3.5]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.segments[0].end / rate).toBeCloseTo(3.1, 2);
  });

  it("候補が足りないとき、足りない切れ目を示す", () => {
    expect(splitNarration(audio(1, -1, 1), rate, [1, 1, 1])).toMatchObject({
      ok: false,
      reason: expect.stringContaining("切れ目 2"),
    });
  });

  it("選んだ無音が minBoundarySec 未満なら、その切れ目を示す", () => {
    expect(splitNarration(audio(1, -0.2, 1), rate, [1, 1])).toMatchObject({
      ok: false,
      reason: expect.stringContaining("切れ目 1"),
    });
    expect(splitNarration(audio(1, -0.2, 1), rate, [1, 1], { minBoundarySec: 0.2 }).ok).toBe(true);
  });

  it("字幕が 1 つなら全体を返す", () => {
    const pcm = audio(-0.5, 1, -0.5);
    expect(splitNarration(pcm, rate, [1])).toEqual({
      ok: true,
      segments: [{ start: 0, end: pcm.length }],
    });
  });

  it("有音が無ければ失敗する", () => {
    expect(splitNarration(audio(-1), rate, [1])).toMatchObject({ ok: false });
    expect(splitNarration(new Int16Array(0), rate, [1])).toMatchObject({ ok: false });
  });

  it("無効な重みやサンプルレートを拒否する", () => {
    for (const weights of [[], [0], [-1], [Number.NaN], [Number.POSITIVE_INFINITY]]) {
      expect(splitNarration(audio(1), rate, weights).ok).toBe(false);
    }
    expect(splitNarration(audio(1), 0, [1]).ok).toBe(false);
  });
});

describe("trimSilence", () => {
  it("両端を削って keepSec を残し、途中の間は残す", () => {
    const pcm = audio(-0.5, 1, -0.3, 1, -0.5);
    expect(trimSilence(pcm, rate).length).toBe(Math.round(2.4 * rate));
    expect(trimSilence(pcm, rate, { keepSec: 0.1 }).length).toBe(2.5 * rate);
  });

  it("全部無音なら長さ 0、端に無音が無ければ全体を返す", () => {
    expect(trimSilence(audio(-1), rate)).toHaveLength(0);
    expect(trimSilence(new Int16Array(0), rate)).toHaveLength(0);
    const pcm = audio(1);
    expect(trimSilence(pcm, rate)).toEqual(pcm);
  });
});
