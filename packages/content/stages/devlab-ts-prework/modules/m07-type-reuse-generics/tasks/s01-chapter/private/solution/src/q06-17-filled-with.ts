// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問17
export function filledWith<T>(length: number, value: T): T[] {
  return Array.from({ length }, () => value);
}
