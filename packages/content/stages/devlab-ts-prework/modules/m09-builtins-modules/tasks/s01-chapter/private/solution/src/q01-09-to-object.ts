// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問9
export function toObject(scores: Map<string, number>): Record<string, number> {
  return Object.fromEntries(scores);
}
