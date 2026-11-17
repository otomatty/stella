// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問19
export function labelOf(item: { id: number; label?: string }): string {
  return item.label ?? `#${item.id}`;
}
