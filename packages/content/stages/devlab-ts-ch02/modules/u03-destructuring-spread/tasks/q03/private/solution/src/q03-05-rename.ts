// 02-q03 分割代入とスプレッド構文 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/spread-syntax-for-object

export type Item = { id: number; name: string; price: number; stock: number };

// 問5
export function rename(item: Item, name: string): Item {
  return { ...item, name };
}
