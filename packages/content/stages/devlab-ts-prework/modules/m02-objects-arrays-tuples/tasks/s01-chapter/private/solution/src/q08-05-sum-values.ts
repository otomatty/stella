// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問5
export function sumValues(record: { [key: string]: number }): number {
  let total = 0;
  for (const value of Object.values(record)) {
    total += value;
  }
  return total;
}
