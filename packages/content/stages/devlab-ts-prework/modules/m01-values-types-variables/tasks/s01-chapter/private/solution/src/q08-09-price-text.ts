// 01-q08 any をなくす ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/any

// 問9
export function priceText(price: number): string {
  return `${price.toLocaleString("ja-JP")}円`;
}
