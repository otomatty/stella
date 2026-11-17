// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問11
export function positionsOf(text: string, char: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === char) {
      result.push(i);
    }
  }
  return result;
}
