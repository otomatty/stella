import type { Director } from "./director";
import { validateShot, pixelRegion } from "./shots";

export type Regions = Record<string, [number, number, number, number]>;
export type Marks = Record<string, [number, number]>;
export interface ClipBrowser {
  tab: string;
  address: string;
}
export interface ClipDefinition {
  id: string;
  user?: string;
  seedSql?: string[];
  /** STELLA の Web / API を使わないクリップ。run の中で t.page.goto(...) して開く。 */
  standalone?: boolean;
  /** 動画の側で描くブラウザーの枠のタブ名とアドレス。省略時は STELLA のもの。 */
  browser?: ClipBrowser;
  /** セレクタか、1600×1000 の [x, y, 幅, 高さ]。配列は要素を探さずそのまま残す。 */
  regions: Record<string, string | [number, number, number, number]>;
  run(t: Director): Promise<void>;
}
function validateBrowser(browser: ClipBrowser) {
  if (
    browser === null ||
    typeof browser !== "object" ||
    typeof browser.tab !== "string" ||
    browser.tab.length < 1 ||
    browser.tab.length > 20 ||
    /[\r\n]/.test(browser.tab)
  )
    throw new Error("browser.tab は 1〜20 字で改行なしにしてください");
  if (
    typeof browser.address !== "string" ||
    browser.address.length < 1 ||
    browser.address.length > 70 ||
    /[\r\n]/.test(browser.address)
  )
    throw new Error("browser.address は 1〜70 字で改行なしにしてください");
}
export function validateClipId(id: string) {
  if (typeof id !== "string" || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(id))
    throw new Error(`クリップ id が不正です: ${id}`);
}
function selectorRegions(regions: ClipDefinition["regions"] | undefined): Record<string, string> {
  if (!regions || typeof regions !== "object" || Array.isArray(regions))
    throw new Error("regions はオブジェクトにしてください");
  const selectors: Record<string, string> = {};
  for (const [name, region] of Object.entries(regions)) {
    if (typeof region === "string") {
      selectors[name] = region;
      continue;
    }
    if (
      !name ||
      !Array.isArray(region) ||
      region.length !== 4 ||
      !region.every((n) => Number.isInteger(n))
    )
      throw new Error(`領域「${name}」は 4 つの整数にしてください`);
    pixelRegion(
      { x: region[0], y: region[1], width: region[2], height: region[3] },
      { width: 1600, height: 1000 },
      1,
    );
  }
  return selectors;
}
export function defineClip(value: ClipDefinition): ClipDefinition {
  validateClipId(value?.id);
  validateShot(value.id, { regions: selectorRegions(value?.regions) });
  if (value.standalone !== undefined && typeof value.standalone !== "boolean")
    throw new Error("standalone は boolean にしてください");
  if (value.user !== undefined && (typeof value.user !== "string" || !value.user.trim()))
    throw new Error("user は空でない文字列にしてください");
  if (
    value.seedSql !== undefined &&
    (!Array.isArray(value.seedSql) || !value.seedSql.every((s) => typeof s === "string"))
  )
    throw new Error("seedSql は文字列の配列にしてください");
  if (value.standalone === true && (value.user !== undefined || value.seedSql !== undefined))
    throw new Error("standalone のクリップに user と seedSql は使えません");
  if (value.browser !== undefined) validateBrowser(value.browser);
  if (typeof value.run !== "function") throw new Error("run が必要です");
  return value;
}

/** 失敗箇所が error.message だけで分かるように、投げた Error の先頭に名前を付ける。 */
export async function step<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error && !error.message.startsWith(`${name}: `))
      error.message = `${name}: ${error.message}`;
    throw error;
  }
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
  browser?: ClipBrowser,
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
  const metadata = {
    source,
    video: `clips/${id}.mp4`,
    width: 1600,
    height: 1000,
    fps,
    duration: roundedDuration,
    marks: roundedMarks,
    regions,
  };
  if (browser === undefined) return metadata;
  validateBrowser(browser);
  return { ...metadata, browser: { tab: browser.tab, address: browser.address } };
}
