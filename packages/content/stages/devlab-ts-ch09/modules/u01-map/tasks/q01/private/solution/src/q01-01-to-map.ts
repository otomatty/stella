// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問1
export function toMap(pairs: [string, number][]): Map<string, number> {
  return new Map(pairs);
}
