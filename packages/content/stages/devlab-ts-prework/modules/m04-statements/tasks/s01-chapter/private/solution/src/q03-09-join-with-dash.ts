// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問9
export function joinWithDash(items: readonly string[]): string {
  let result = "";
  for (const [i, item] of items.entries()) {
    result += i === 0 ? item : `-${item}`;
  }
  return result;
}
