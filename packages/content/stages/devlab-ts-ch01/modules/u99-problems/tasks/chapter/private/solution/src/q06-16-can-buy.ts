// 01-q06 boolean型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/boolean
//       https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values

// 問16
export function canBuy(money: number, price: number, inStock: boolean): boolean {
  return money >= price && inStock;
}
