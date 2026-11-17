// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問3
export function longestWord(words: readonly string[]): string {
  let longest = "";
  for (const word of words) {
    if (word.length > longest.length) {
      longest = word;
    }
  }
  return longest;
}
