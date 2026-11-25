// 問18 型 Maybe<T>（T | null）を定義して export し、orElse(value, fallback) で null なら fallback を返す
//     例: orElse(null, 5) → 5
// 型変数を unknown で置き換えないでください。

export type Maybe<T> = T | null;

export function orElse<T>(value: Maybe<T>, fallback: T): T {
  return value ?? fallback;
}
