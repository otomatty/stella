/** 本棚の画面の並べ方 (純関数。テストしやすいよう画面から分けておく)。 */
import type { LibraryShelfEntry } from "@stella/shared/library/types";

/** 表紙 1 冊の最小の幅 (px) と間隔。幅から 1 段に並べる冊数を決める。 */
const MIN_COVER_WIDTH = 104;
const GAP = 20;

/** 棚 1 段に並べる冊数。スマホでも 3 冊、広い画面でも 8 冊まで。 */
export function shelfColumns(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 3;
  return Math.min(8, Math.max(3, Math.floor((width + GAP) / (MIN_COVER_WIDTH + GAP))));
}

/** 本を棚の段に分ける。 */
export function shelfRows<T>(items: readonly T[], columns: number): T[][] {
  const size = Math.max(1, Math.floor(columns));
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/** 0〜1 の進み具合。読書中の本の細いバーに使う。 */
export function shelfProgress(entry: Pick<LibraryShelfEntry, "progress">): number {
  const { completedChapters, totalChapters } = entry.progress;
  if (totalChapters <= 0) return 0;
  return Math.min(1, Math.max(0, completedChapters / totalChapters));
}

/** 表紙が無い・読めないときの代わりの表紙の色。書名から決まり、同じ本はいつも同じ色。 */
const PLACEHOLDER_HUES = [12, 32, 150, 190, 215, 250, 280, 330] as const;
export function placeholderHue(title: string): number {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return PLACEHOLDER_HUES[hash % PLACEHOLDER_HUES.length] ?? PLACEHOLDER_HUES[0];
}

/** 秒を「12:34」「1:02:03」にする。 */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** 保存した位置から再開してよいか (終わり間際なら最初から)。 */
export function resumePosition(saved: number, duration: number): number {
  if (!Number.isFinite(saved) || saved <= 0) return 0;
  if (Number.isFinite(duration) && duration > 0 && saved >= duration - 5) return 0;
  return saved;
}
