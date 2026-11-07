// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問15
export function groupByLength(words: readonly string[]): { [length: string]: string[] } {
  const groups: { [length: string]: string[] } = {};
  for (const word of words) {
    const key = String(word.length);
    groups[key] = [...(groups[key] ?? []), word];
  }
  return groups;
}
