// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問4
export function keyCount(record: { [key: string]: number }): number {
  return Object.keys(record).length;
}
