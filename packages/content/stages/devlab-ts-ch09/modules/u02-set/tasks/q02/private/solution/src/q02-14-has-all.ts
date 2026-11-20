// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問14
export function hasAll(set: Set<string>, values: string[]): boolean {
  return values.every((value) => set.has(value));
}
