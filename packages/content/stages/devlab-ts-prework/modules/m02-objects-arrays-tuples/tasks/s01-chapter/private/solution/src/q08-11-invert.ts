// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問11
export function invert(record: { [key: string]: string }): { [value: string]: string } {
  const result: { [value: string]: string } = {};
  for (const [key, value] of Object.entries(record)) {
    result[value] = key;
  }
  return result;
}
