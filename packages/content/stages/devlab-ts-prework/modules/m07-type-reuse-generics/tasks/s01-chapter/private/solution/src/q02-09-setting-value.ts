// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export const SETTINGS = { theme: "light", fontSize: 14, beta: false };

// 問9
export function settingValue(key: keyof typeof SETTINGS): string | number | boolean {
  return SETTINGS[key];
}
