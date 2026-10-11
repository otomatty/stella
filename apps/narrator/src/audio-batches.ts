// Eight chunks use at most 49 D1 statements per step. Reserve 64 steps for
// preparation, finalization and failure cleanup within the Free plan's 1024 cap.
export const AUDIO_CHUNKS_PER_STEP = 8;
export const AUDIO_CONCAT_BATCH_SIZE = 200;
export const MAX_AUDIO_CHUNKS = 7680;
export interface AudioPart {
  key: string;
  bytes: number;
  seconds: number;
}
export function audioConcatGroups(parts: AudioPart[]): AudioPart[][] {
  return Array.from({ length: Math.ceil(parts.length / AUDIO_CONCAT_BATCH_SIZE) }, (_, index) =>
    parts.slice(index * AUDIO_CONCAT_BATCH_SIZE, (index + 1) * AUDIO_CONCAT_BATCH_SIZE),
  );
}
export function audioBatchStarts(count: number): number[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_AUDIO_CHUNKS)
    throw new Error("読み上げの分割数が上限を超えています");
  return Array.from(
    { length: Math.ceil(count / AUDIO_CHUNKS_PER_STEP) },
    (_, index) => index * AUDIO_CHUNKS_PER_STEP,
  );
}
