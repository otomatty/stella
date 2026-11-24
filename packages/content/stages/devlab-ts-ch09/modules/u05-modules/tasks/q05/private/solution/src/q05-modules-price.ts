// 問題
// q05-modules.ts から、TAX_RATE と priceWithTax をこのファイルに移し、名前付き export にする。
// 関数の中身は変えないこと。

export const TAX_RATE = 0.1;

export function priceWithTax(price: number): number {
  return Math.round(price * (1 + TAX_RATE));
}
