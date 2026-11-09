// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問3
export function hasDuplicates(items: number[]): boolean {
  return new Set(items).size !== items.length;
}
