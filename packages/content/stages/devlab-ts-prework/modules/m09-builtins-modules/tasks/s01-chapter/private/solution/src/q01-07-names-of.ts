// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問7
export function namesOf(scores: Map<string, number>): string[] {
  return [...scores.keys()];
}
