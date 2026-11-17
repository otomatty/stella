// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining

// 問9
export function indexOrNull(items: readonly string[], target: string): number | null {
  const index = items.indexOf(target);
  return index === -1 ? null : index;
}
