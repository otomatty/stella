// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問17
export function timeoutMs(options: { timeoutSeconds?: number }): number {
  return (options.timeoutSeconds ?? 30) * 1000;
}
