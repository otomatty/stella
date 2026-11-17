// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問4
export function priceText(price: number, currency = "円"): string {
  return `${price.toLocaleString("ja-JP")}${currency}`;
}
