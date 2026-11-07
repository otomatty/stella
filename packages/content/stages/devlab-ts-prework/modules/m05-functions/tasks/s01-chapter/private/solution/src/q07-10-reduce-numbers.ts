// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問10
export function reduceNumbers(
  numbers: readonly number[],
  fn: (acc: number, n: number) => number,
  initial: number,
): number {
  let acc = initial;
  for (const n of numbers) {
    acc = fn(acc, n);
  }
  return acc;
}
