import type { Director } from "./director";
import { validateShot, pixelRegion } from "./shots";

export type Regions = Record<string, [number, number, number, number]>;
export type Marks = Record<string, [number, number]>;
export interface ClipDefinition {
  id: string;
  user?: string;
  seedSql?: string[];
  regions: Record<string, string>;
  run(t: Director): Promise<void>;
}
export function validateClipId(id: string) {
  if (typeof id !== "string" || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(id))
    throw new Error(`クリップ id が不正です: ${id}`);
}
export function defineClip(value: ClipDefinition): ClipDefinition {
  validateClipId(value?.id);
  validateShot(value.id, { regions: value.regions });
  if (value.user !== undefined && (typeof value.user !== "string" || !value.user.trim()))
    throw new Error("user は空でない文字列にしてください");
  if (
    value.seedSql !== undefined &&
    (!Array.isArray(value.seedSql) || !value.seedSql.every((s) => typeof s === "string"))
  )
    throw new Error("seedSql は文字列の配列にしてください");
  if (typeof value.run !== "function") throw new Error("run が必要です");
  return value;
}

/** 開始時に名前を予約する。失敗した区間は保存しないが、同じ名前は再利用できない。 */
export class ClipMarks {
  readonly marks: Marks = Object.create(null);
  private names = new Set<string>();
  constructor(private elapsed: () => number) {}
  async mark(name: string, fn: () => Promise<void>) {
    if (!/^[a-z0-9-]+$/.test(name) || this.names.has(name))
      throw new Error(`mark の名前が不正または重複しています: ${name}`);
    this.names.add(name);
    const start = this.elapsed();
    await fn();
    this.marks[name] = [start, this.elapsed()];
  }
}

export function clipMetadata(
  id: string,
  source: string,
  duration: number,
  fps: number,
  marks: Marks,
  regions: Regions,
) {
  validateClipId(id);
  if (!Number.isFinite(duration) || duration <= 0 || fps !== 30)
    throw new Error("動画の長さまたは fps が不正です");
  for (const [name, range] of Object.entries(marks)) {
    if (
      !/^[a-z0-9-]+$/.test(name) ||
      range.length !== 2 ||
      !range.every(Number.isFinite) ||
      range[0] < 0 ||
      range[1] <= range[0] ||
      range[1] > duration
    )
      throw new Error(`mark の区間が不正です: ${name}`);
  }
  for (const [name, rect] of Object.entries(regions)) {
    if (!name || !Array.isArray(rect) || rect.length !== 4) throw new Error("regions が不正です");
    pixelRegion(
      { x: rect[0], y: rect[1], width: rect[2], height: rect[3] },
      { width: 1600, height: 1000 },
      1,
    );
  }
  const seconds = (value: number) => Math.round(value * 100) / 100;
  const roundedDuration = seconds(duration);
  const roundedMarks = Object.fromEntries(
    Object.entries(marks).map(([name, range]) => [name, range.map(seconds) as [number, number]]),
  );
  if (roundedDuration <= 0) throw new Error("丸めた動画の長さが不正です");
  for (const [name, range] of Object.entries(roundedMarks))
    if (range[0] >= range[1]) throw new Error(`丸めた mark の区間が不正です: ${name}`);
  return {
    source,
    video: `clips/${id}.mp4`,
    width: 1600,
    height: 1000,
    fps,
    duration: roundedDuration,
    marks: roundedMarks,
    regions,
  };
}
