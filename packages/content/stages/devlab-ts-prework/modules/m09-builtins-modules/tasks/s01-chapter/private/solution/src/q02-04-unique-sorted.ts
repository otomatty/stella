// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問4
export function uniqueSorted(items: number[]): number[] {
  return [...new Set(items)].sort((a, b) => a - b);
}
