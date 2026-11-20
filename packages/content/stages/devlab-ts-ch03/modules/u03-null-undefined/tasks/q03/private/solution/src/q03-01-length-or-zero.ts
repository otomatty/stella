// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining

// 問1
export function lengthOrZero(text: string | undefined): number {
  return text?.length ?? 0;
}
