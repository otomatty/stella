// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問9
export function union(a: Set<number>, b: Set<number>): Set<number> {
  return new Set([...a, ...b]);
}
