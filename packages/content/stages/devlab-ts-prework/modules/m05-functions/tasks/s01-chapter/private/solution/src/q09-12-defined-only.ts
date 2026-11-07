// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

// 問12
export function definedOnly(values: readonly (number | undefined)[]): number[] {
  return values.filter((value): value is number => value !== undefined);
}
