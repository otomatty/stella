// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問16
export function rejectNumbers(
  numbers: readonly number[],
  predicate: (n: number) => boolean,
): number[] {
  const result: number[] = [];
  for (const n of numbers) {
    if (!predicate(n)) {
      result.push(n);
    }
  }
  return result;
}
