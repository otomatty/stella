// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問8
export type Box<T> = { value: T };

export function boxOf<T>(value: T): Box<T> {
  return { value };
}
