// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問10
export function intersection(a: Set<number>, b: Set<number>): Set<number> {
  return new Set([...a].filter((n) => b.has(n)));
}
