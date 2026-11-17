// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint

// 問17
export function hasAllKeys<T extends object>(obj: T, keys: readonly (keyof T)[]): boolean {
  return keys.every((key) => obj[key] !== undefined);
}
