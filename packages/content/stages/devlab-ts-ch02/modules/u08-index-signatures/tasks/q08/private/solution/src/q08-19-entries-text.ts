// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問19
export function entriesText(record: { [key: string]: number }): string {
  return Object.entries(record)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}
