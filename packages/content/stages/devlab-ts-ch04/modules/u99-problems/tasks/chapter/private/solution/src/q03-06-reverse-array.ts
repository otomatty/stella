// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問6
export function reverseArray(items: readonly string[]): string[] {
  const result: string[] = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item !== undefined) {
      result.push(item);
    }
  }
  return result;
}
