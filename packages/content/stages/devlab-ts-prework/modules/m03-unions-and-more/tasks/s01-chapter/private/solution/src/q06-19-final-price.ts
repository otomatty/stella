// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Priced = { price: number };

// 問19
export type Discounted = Priced & { discount: number };

export function finalPrice(x: Discounted): number {
  return Math.max(x.price - x.discount, 0);
}
