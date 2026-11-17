// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問15
export function hasAny(set: Set<string>, values: string[]): boolean {
  return values.some((value) => set.has(value));
}
