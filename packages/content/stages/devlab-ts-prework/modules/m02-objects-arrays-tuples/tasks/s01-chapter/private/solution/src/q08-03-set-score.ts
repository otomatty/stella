// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問3
export function setScore(
  scores: { [name: string]: number },
  name: string,
  score: number,
): { [name: string]: number } {
  return { ...scores, [name]: score };
}
