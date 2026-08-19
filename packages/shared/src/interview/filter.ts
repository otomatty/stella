import { COMMON_CATEGORY } from "./types.js";

/**
 * 案件種別タグ同士の階層照合。 タグは "/" 区切り (例: "PHP/Laravel")。
 * 上位・下位のどちらからでもマッチさせる —
 * 割当 "PHP" は "PHP/Laravel" の問題を拾い、 割当 "PHP/Laravel" は "PHP" の問題も拾う。
 *
 * COMMON_CATEGORY の常時通過はここでは扱わない (visibleQuestions 側の責務)。
 * ここに入れると、 受講者がチップで "PHP" を選んだときに共通問題まで出てしまう。
 */
export function tagMatches(tag: string, selected: string): boolean {
  return tag === selected || tag.startsWith(`${selected}/`) || selected.startsWith(`${tag}/`);
}

/**
 * 受講者に見せる質問: 共通タグ + 割当タグにマッチするもの。
 * API (D1 行) と web (バンドル済み fixtures) の両方で使うため categories だけに依存する。
 */
export function visibleQuestions<T extends { categories: string[] }>(
  all: T[],
  assignedCategories: string[],
): T[] {
  return all.filter((q) =>
    q.categories.some(
      (tag) => tag === COMMON_CATEGORY || assignedCategories.some((a) => tagMatches(tag, a)),
    ),
  );
}
