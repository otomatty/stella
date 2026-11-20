// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問7
export function squaresUpTo(n: number): number[] {
  const result: number[] = [];
  for (let i = 1; i <= n; i++) {
    result.push(i * i);
  }
  return result;
}
