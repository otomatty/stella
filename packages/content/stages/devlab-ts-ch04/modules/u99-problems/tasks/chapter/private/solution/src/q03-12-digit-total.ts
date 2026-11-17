// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問12
export function digitTotal(text: string): number {
  let total = 0;
  for (const c of text) {
    if (c >= "0" && c <= "9") {
      total += Number(c);
    }
  }
  return total;
}
