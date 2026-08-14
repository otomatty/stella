import { COMMON_CATEGORY } from "./types.js";

/**
 * 受講者に見せる質問: 共通カテゴリ + 割当カテゴリのみ。
 * API (D1 行) と web (バンドル済み fixtures) の両方で使うため category だけに依存する。
 */
export function visibleQuestions<T extends { category: string }>(
  all: T[],
  assignedCategories: string[],
): T[] {
  const allowed = new Set([COMMON_CATEGORY, ...assignedCategories]);
  return all.filter((q) => allowed.has(q.category));
}
