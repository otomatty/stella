// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問9
export function withTax(price: number, rate = 0.1): number {
  return Math.floor(price * (1 + rate));
}
