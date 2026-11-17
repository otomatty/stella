// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問8
export function evensUpTo(n: number): number[] {
  const result: number[] = [];
  for (let i = 0; i <= n; i += 2) {
    result.push(i);
  }
  return result;
}
