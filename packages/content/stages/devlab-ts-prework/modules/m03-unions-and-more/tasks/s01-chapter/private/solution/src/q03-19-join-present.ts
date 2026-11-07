// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining

// 問19
export function joinPresent(a: string | null, b: string | null): string {
  if (a === null) {
    return b ?? "";
  }
  if (b === null) {
    return a;
  }
  return `${a} ${b}`;
}
