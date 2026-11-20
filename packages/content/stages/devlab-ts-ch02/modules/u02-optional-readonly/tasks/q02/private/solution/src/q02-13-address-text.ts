// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問13
export function addressText(address: { city: string; building?: string }): string {
  return address.building === undefined ? address.city : `${address.city} ${address.building}`;
}
