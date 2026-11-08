// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問13
export function isSubset(a: Set<number>, b: Set<number>): boolean {
  return [...a].every((n) => b.has(n));
}
