// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問1
export function mapNumbers(numbers: readonly number[], fn: (n: number) => number): number[] {
  const result: number[] = [];
  for (const n of numbers) {
    result.push(fn(n));
  }
  return result;
}
