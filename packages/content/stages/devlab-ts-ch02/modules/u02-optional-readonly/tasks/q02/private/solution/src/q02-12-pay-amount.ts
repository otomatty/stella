// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問12
export function payAmount(order: { price: number; coupon?: number }): number {
  return order.price - (order.coupon ?? 0);
}
