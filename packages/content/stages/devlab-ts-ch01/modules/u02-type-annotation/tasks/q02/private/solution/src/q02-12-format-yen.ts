// 01-q02 型注釈 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-annotation

// 問12
export function formatYen(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}円`;
}
