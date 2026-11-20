// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問1
export function scoreOf(scores: { [name: string]: number }, name: string): number {
  return scores[name] ?? 0;
}
