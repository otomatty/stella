// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問20
export function lookupOr(record: { [key: string]: string }, key: string, fallback: string): string {
  return record[key] ?? fallback;
}
