// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問12
export function applyTwice(fn: (n: number) => number, x: number): number {
  return fn(fn(x));
}
