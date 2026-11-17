// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問10
export function countUpper(text: string): number {
  let count = 0;
  for (const c of text) {
    if (c >= "A" && c <= "Z") {
      count++;
    }
  }
  return count;
}
