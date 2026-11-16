import type { Director } from "./director";

export interface ShotOptions {
  regions: Record<string, string>;
  /** 本文など、画面より大きい領域だけ可視範囲に切り詰める。 */
  clipRegions?: string[];
}
export type TakeShot = (id: string, options: ShotOptions) => Promise<void>;
export interface ShotsDefinition {
  id: string;
  user?: string;
  seedSql?: string[];
  run(t: Director, shot: TakeShot): Promise<void>;
}
export function defineShots(value: ShotsDefinition): ShotsDefinition {
  if (!value || typeof value.id !== "string" || !/^[a-z0-9-]+$/.test(value.id))
    throw new Error("静止画の定義 id が不正です");
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
export function validateShot(id: string, options: ShotOptions) {
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(id)) throw new Error(`ショット id が不正です: ${id}`);
  if (!options?.regions || typeof options.regions !== "object" || Array.isArray(options.regions))
    throw new Error("regions はオブジェクトにしてください");
  for (const [name, selector] of Object.entries(options.regions)) {
    if (!name || typeof selector !== "string" || !selector.trim())
      throw new Error(`領域「${name}」のセレクタが不正です`);
  }
  if (
    options.clipRegions &&
    (!Array.isArray(options.clipRegions) ||
      !options.clipRegions.every((n) => typeof n === "string" && Object.hasOwn(options.regions, n)))
  )
    throw new Error("clipRegions は regions にある名前の配列にしてください");
}
export function pixelRegion(
  rect: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number },
  scale: number,
  clip = false,
): [number, number, number, number] {
  const { x, y, width, height } = rect;
  if (
    ![x, y, width, height, viewport.width, viewport.height, scale].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    scale <= 0
  )
    throw new Error("領域のサイズが不正です");
  if (!clip && (x < 0 || y < 0 || x + width > viewport.width || y + height > viewport.height))
    throw new Error("領域が画面の外にあります");
  const left = Math.max(0, x),
    top = Math.max(0, y);
  const right = Math.min(viewport.width, x + width),
    bottom = Math.min(viewport.height, y + height);
  if (right <= left || bottom <= top) throw new Error("領域が画面の外にあります");
  const px = Math.floor(left * scale),
    py = Math.floor(top * scale);
  return [px, py, Math.ceil(right * scale) - px, Math.ceil(bottom * scale) - py];
}
