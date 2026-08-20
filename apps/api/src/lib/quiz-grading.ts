/**
 * 設問 1 問の採点規則: 正解集合と選択集合の完全一致 (順不同・重複無視)。
 * クイズ本編 (`routes/quiz.ts`) と SRS 復習 (`routes/srs.ts`) で共用する。
 */
export function isExactSelection(
  correct: ReadonlySet<string>,
  selected: ReadonlySet<string>,
): boolean {
  return correct.size === selected.size && [...correct].every((id) => selected.has(id));
}
