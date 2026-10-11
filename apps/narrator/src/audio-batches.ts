// Eight chunks use at most 49 D1 statements per step. Reserve 24 steps for
// preparation, finalization and failure cleanup within the Free plan's 1024 cap.
export const AUDIO_CHUNKS_PER_STEP = 8;
export function audioBatchStarts(count: number): number[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > AUDIO_CHUNKS_PER_STEP * 1000)
    throw new Error("読み上げの分割数が上限を超えています");
  return Array.from(
    { length: Math.ceil(count / AUDIO_CHUNKS_PER_STEP) },
    (_, index) => index * AUDIO_CHUNKS_PER_STEP,
  );
}
