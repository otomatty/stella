// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問2
export function hasKey(record: { [key: string]: string }, key: string): boolean {
  return record[key] !== undefined;
}
