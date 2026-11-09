// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問12
export function symmetricDifference(a: Set<number>, b: Set<number>): Set<number> {
  return new Set([...[...a].filter((n) => !b.has(n)), ...[...b].filter((n) => !a.has(n))]);
}
