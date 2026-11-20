// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問8
export function priceLabel(price: number, unit?: string): string {
  return `${price.toLocaleString("ja-JP")}${unit ?? "円"}`;
}
