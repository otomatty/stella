// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問2
export function scoreOf(scores: Map<string, number>, name: string): number {
  return scores.get(name) ?? 0;
}
