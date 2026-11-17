// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問5
export function repeatValue<T>(value: T, times: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < times; i++) {
    result.push(value);
  }
  return result;
}
