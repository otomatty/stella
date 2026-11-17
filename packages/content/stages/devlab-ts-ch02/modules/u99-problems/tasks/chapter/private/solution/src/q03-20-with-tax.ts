// 02-q03 分割代入とスプレッド構文 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/spread-syntax-for-object

export type Item = { id: number; name: string; price: number; stock: number };

// 問20
export function withTax(item: Item): Item {
  return { ...item, price: Math.floor((item.price * 110) / 100) };
}
