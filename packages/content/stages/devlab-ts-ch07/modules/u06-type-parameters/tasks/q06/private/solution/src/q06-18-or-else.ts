// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問18
export type Maybe<T> = T | null;

export function orElse<T>(value: Maybe<T>, fallback: T): T {
  return value ?? fallback;
}
