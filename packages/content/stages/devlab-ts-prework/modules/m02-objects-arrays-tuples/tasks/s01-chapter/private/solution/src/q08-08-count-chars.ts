// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問8
export function countChars(text: string): { [char: string]: number } {
  const counts: { [char: string]: number } = {};
  for (const char of text) {
    counts[char] = (counts[char] ?? 0) + 1;
  }
  return counts;
}
