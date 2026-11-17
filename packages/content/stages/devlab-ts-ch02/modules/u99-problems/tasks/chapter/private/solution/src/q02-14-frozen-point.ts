// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問14
export function frozenPoint(x: number, y: number): { readonly x: number; readonly y: number } {
  return { x, y };
}
