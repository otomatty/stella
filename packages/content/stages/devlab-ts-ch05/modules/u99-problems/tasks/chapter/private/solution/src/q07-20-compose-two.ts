// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問20
export function composeTwo(f: (n: number) => number, g: (n: number) => number, x: number): number {
  return g(f(x));
}
