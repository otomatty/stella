// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names

// 問7
export function bookLabel(book: { title: string; price: number }): string {
  return `${book.title}（${book.price.toLocaleString("ja-JP")}円）`;
}
