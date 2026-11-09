// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問16
export function titleText(book: { title: string; subtitle?: string }): string {
  return book.subtitle === undefined ? book.title : `${book.title}: ${book.subtitle}`;
}
