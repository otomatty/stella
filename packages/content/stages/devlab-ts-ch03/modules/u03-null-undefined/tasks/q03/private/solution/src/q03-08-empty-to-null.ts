// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining

// 問8
export function emptyToNull(text: string): string | null {
  return text === "" ? null : text;
}
