// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問20
export function stairs(n: number): string[] {
  const result: string[] = [];
  for (let i = 1; i <= n; i++) {
    result.push("*".repeat(i));
  }
  return result;
}
