// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問9
export function times(n: number, fn: (i: number) => void): void {
  for (let i = 0; i < n; i++) {
    fn(i);
  }
}
