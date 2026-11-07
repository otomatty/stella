// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問18
export function filterAtLeast(
  record: { [key: string]: number },
  min: number,
): { [key: string]: number } {
  const result: { [key: string]: number } = {};
  for (const [key, value] of Object.entries(record)) {
    if (value >= min) {
      result[key] = value;
    }
  }
  return result;
}
