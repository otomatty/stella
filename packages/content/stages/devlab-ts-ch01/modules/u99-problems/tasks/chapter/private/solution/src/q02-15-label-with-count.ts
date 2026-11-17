// 01-q02 型注釈 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-annotation

// 問15
export function labelWithCount(label: string, count: number): string {
  return `${label}（${count}件）`;
}
