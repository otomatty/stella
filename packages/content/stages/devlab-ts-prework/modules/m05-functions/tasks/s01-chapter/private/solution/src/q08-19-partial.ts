// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問19
export function partial(fn: (a: number, b: number) => number, a: number): (b: number) => number {
  return (b) => fn(a, b);
}
