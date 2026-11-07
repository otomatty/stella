// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問17
export function flatten(nested: readonly (readonly number[])[]): number[] {
  const result: number[] = [];
  for (const inner of nested) {
    for (const n of inner) {
      result.push(n);
    }
  }
  return result;
}
