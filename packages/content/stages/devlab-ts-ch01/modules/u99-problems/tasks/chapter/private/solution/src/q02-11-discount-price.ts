// 01-q02 型注釈 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-annotation

// 問11
export function discountPrice(price: number, percentOff: number): number {
  return Math.floor((price * (100 - percentOff)) / 100);
}
