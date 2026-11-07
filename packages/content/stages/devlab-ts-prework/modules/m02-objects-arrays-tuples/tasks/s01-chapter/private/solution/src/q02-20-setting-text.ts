// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問20
export function settingText(setting: { readonly darkMode: boolean; fontSize?: number }): string {
  return `${setting.darkMode ? "ダーク" : "ライト"} / ${setting.fontSize ?? 16}px`;
}
