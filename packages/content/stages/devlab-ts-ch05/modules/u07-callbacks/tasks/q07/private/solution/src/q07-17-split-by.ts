// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問17
export function splitBy(
  numbers: readonly number[],
  predicate: (n: number) => boolean,
): [number[], number[]] {
  const yes: number[] = [];
  const no: number[] = [];
  for (const n of numbers) {
    if (predicate(n)) {
      yes.push(n);
    } else {
      no.push(n);
    }
  }
  return [yes, no];
}
