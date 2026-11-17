// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining

// 問10
export function parseOrNull(text: string): number | null {
  const value = Number(text);
  return Number.isNaN(value) ? null : value;
}
