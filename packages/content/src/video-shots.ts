/** ショットの定義と画像ピクセルでの領域。I/O は呼び出し側で行う。 */
export type ShotRegion = [number, number, number, number];
export interface FrameDefinition {
  id: string;
  video: string;
  at: number;
  regions: Record<string, ShotRegion>;
}
export interface VideoInfo {
  width: number;
  height: number;
  duration: number;
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export const SHOT_ID = /^[a-z0-9-]+\/[a-z0-9-]+$/;
export function validRegion(value: unknown, width: number, height: number): value is ShotRegion {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(Number.isFinite)) return false;
  const [x, y, w, h] = value;
  return x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= width && y + h <= height;
}
export function validateFrames(
  input: unknown,
  videos: Record<string, VideoInfo | undefined>,
): { frames: FrameDefinition[]; errors: string[] } {
  const errors: string[] = [];
  const frames: FrameDefinition[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(input)) return { frames, errors: ["frames.json は配列にしてください"] };
  for (const [i, value] of input.entries()) {
    const label = `定義 ${i + 1}`;
    if (!isRecord(value)) {
      errors.push(`${label}: オブジェクトにしてください`);
      continue;
    }
    const { id, video, at, regions } = value;
    if (typeof id !== "string" || !SHOT_ID.test(id))
      errors.push(`${label}: id は 組/名前 の英小文字・数字・ハイフンにしてください`);
    if (typeof id === "string") {
      if (seen.has(id)) errors.push(`${label}: id「${id}」が重複しています`);
      seen.add(id);
    }
    const info = typeof video === "string" ? videos[video] : undefined;
    if (!info)
      errors.push(`${label}: 動画がないか、長さ・画像サイズを取得できません: ${String(video)}`);
    if (typeof at !== "number" || !Number.isFinite(at) || at < 0 || (info && at >= info.duration))
      errors.push(`${label}: at は動画の長さの中の秒数にしてください`);
    if (!isRecord(regions)) errors.push(`${label}: regions はオブジェクトにしてください`);
    else
      for (const [name, rect] of Object.entries(regions)) {
        if (!validRegion(rect, info?.width ?? Infinity, info?.height ?? Infinity))
          errors.push(
            `${label}: 領域「${name}」は画像内で幅・高さが正の [x, y, 幅, 高さ] にしてください`,
          );
      }
    frames.push(value as unknown as FrameDefinition);
  }
  return { frames: errors.length ? [] : frames, errors };
}
