// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問6
export function increment(
  counts: { [key: string]: number },
  key: string,
): { [key: string]: number } {
  return { ...counts, [key]: (counts[key] ?? 0) + 1 };
}
