interface SilenceOptions {
  thresholdDb?: number;
}

interface SplitOptions extends SilenceOptions {
  minSilenceSec?: number;
  pauseBonus?: number;
  minBoundarySec?: number;
}

type Segment = { start: number; end: number };
type SplitResult = { ok: true; segments: Segment[] } | { ok: false; reason: string };

/** 10ms ごとの RMS で有音フレームを見つける (末尾の端数も調べる)。 */
function speechFrames(pcm: Int16Array, sampleRate: number, thresholdDb: number) {
  const frameSize = Math.max(1, Math.round(sampleRate * 0.01));
  const voiced: boolean[] = [];
  for (let start = 0; start < pcm.length; start += frameSize) {
    const end = Math.min(pcm.length, start + frameSize);
    let sum = 0;
    for (let i = start; i < end; i++) sum += pcm[i] ** 2;
    const db = 20 * Math.log10(Math.sqrt(sum / (end - start)) / 32768);
    voiced.push(db >= thresholdDb);
  }
  return { frameSize, voiced, first: voiced.indexOf(true), last: voiced.lastIndexOf(true) };
}

/** 段落の間を優先しながら、推定長に近い無音の中点で字幕に分ける。 */
export function splitNarration(
  pcm: Int16Array,
  sampleRate: number,
  weights: number[],
  options: SplitOptions = {},
): SplitResult {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    return { ok: false, reason: "サンプルレートが不正です" };
  }
  if (weights.length === 0 || weights.some((w) => !Number.isFinite(w) || w <= 0)) {
    return { ok: false, reason: "推定秒数は正の有限値が必要です" };
  }
  const { frameSize, voiced, first, last } = speechFrames(
    pcm,
    sampleRate,
    options.thresholdDb ?? -45,
  );
  if (first < 0) return { ok: false, reason: "有音フレームがありません" };
  if (weights.length === 1) return { ok: true, segments: [{ start: 0, end: pcm.length }] };
  const candidates: Segment[] = [];
  for (let i = first + 1; i < last; i++) {
    if (voiced[i]) continue;
    const start = i * frameSize;
    while (i < last && !voiced[i]) i++;
    const end = i * frameSize;
    if (
      end - start >=
      Math.max(options.minSilenceSec ?? 0.15, options.minBoundarySec ?? 0.25) * sampleRate
    ) {
      candidates.push({ start, end });
    }
  }
  const count = weights.length - 1;
  if (candidates.length < count) {
    return {
      ok: false,
      reason: `切れ目 ${candidates.length + 1}: 無音候補が足りません (${candidates.length} / ${count})`,
    };
  }
  const total = weights.reduce((sum, w) => sum + w, 0);
  const speechStart = first * frameSize;
  const speechEnd = Math.min(pcm.length, (last + 1) * frameSize);
  const parents: number[][] = [];
  let previous = candidates.map(() => 0);
  let cumulative = 0;
  for (let k = 0; k < count; k++) {
    cumulative += weights[k];
    const expected = speechStart + ((speechEnd - speechStart) * cumulative) / total;
    const current = candidates.map(() => Number.POSITIVE_INFINITY);
    parents[k] = candidates.map(() => -1);
    let best = Number.POSITIVE_INFINITY;
    let bestIndex = -1;
    for (let j = 0; j < candidates.length; j++) {
      if (k === 0) best = 0;
      else if (j > 0 && previous[j - 1] < best) {
        best = previous[j - 1];
        bestIndex = j - 1;
      }
      const c = candidates[j];
      current[j] =
        best +
        (Math.abs((c.start + c.end) / 2 - expected) -
          (options.pauseBonus ?? 2) * (c.end - c.start)) /
          sampleRate;
      parents[k][j] = bestIndex;
    }
    previous = current;
  }
  let index = previous.indexOf(Math.min(...previous));
  const chosen: Segment[] = [];
  for (let k = count - 1; k >= 0; k--) {
    chosen[k] = candidates[index];
    index = parents[k][index];
  }
  const boundaries = [0, ...chosen.map((c) => Math.floor((c.start + c.end) / 2)), pcm.length];
  return {
    ok: true,
    segments: weights.map((_, i) => ({ start: boundaries[i], end: boundaries[i + 1] })),
  };
}

/** 有音フレームの両端に keepSec だけ残し、途中の間はそのままにする。 */
export function trimSilence(
  pcm: Int16Array,
  sampleRate: number,
  options: SilenceOptions & { keepSec?: number } = {},
): Int16Array {
  const { frameSize, first, last } = speechFrames(pcm, sampleRate, options.thresholdDb ?? -45);
  if (first < 0) return new Int16Array(0);
  const keep = Math.round((options.keepSec ?? 0.05) * sampleRate);
  return pcm.subarray(
    Math.max(0, first * frameSize - keep),
    Math.min(pcm.length, (last + 1) * frameSize + keep),
  );
}
