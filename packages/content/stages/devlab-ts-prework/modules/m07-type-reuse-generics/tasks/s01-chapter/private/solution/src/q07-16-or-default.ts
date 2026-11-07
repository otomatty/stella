// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint

// 問16
export function orDefault<T extends string | number>(value: T | undefined, fallback: T): T {
  return value ?? fallback;
}
