// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問7
export function createTodo(
  id: number,
  title: string,
): { readonly id: number; title: string; done: boolean } {
  return { id, title, done: false };
}
