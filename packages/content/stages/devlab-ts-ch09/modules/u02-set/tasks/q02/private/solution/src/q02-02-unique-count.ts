// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問2
export function uniqueCount(items: string[]): number {
  return new Set(items).size;
}
