// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問5
export function someMatch(numbers: readonly number[], predicate: (n: number) => boolean): boolean {
  for (const n of numbers) {
    if (predicate(n)) {
      return true;
    }
  }
  return false;
}
