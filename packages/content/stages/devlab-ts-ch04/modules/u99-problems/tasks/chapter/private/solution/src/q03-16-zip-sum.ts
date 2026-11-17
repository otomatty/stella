// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問16
export function zipSum(a: readonly number[], b: readonly number[]): number[] {
  const result: number[] = [];
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    result.push((a[i] ?? 0) + (b[i] ?? 0));
  }
  return result;
}
