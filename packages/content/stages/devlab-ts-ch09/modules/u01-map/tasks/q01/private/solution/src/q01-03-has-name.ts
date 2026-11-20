// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問3
export function hasName(scores: Map<string, number>, name: string): boolean {
  return scores.has(name);
}
