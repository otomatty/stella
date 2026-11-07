// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問16
export function sortedByValue(scores: Map<string, number>): [string, number][] {
  return [...scores.entries()].sort((a, b) => b[1] - a[1]);
}
