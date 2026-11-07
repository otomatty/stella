// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問12
export function pickKeys(
  record: { [key: string]: number },
  keys: readonly string[],
): { [key: string]: number } {
  const result: { [key: string]: number } = {};
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
