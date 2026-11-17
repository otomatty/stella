// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint

// 問1
export function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
