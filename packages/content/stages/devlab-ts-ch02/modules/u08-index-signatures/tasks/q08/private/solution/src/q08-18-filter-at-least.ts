// 問18 値が min 以上のキーだけを残した、新しいオブジェクトを返す
//     例: filterAtLeast({ a: 1, b: 5, c: 3 }, 3) → { b: 5, c: 3 }
// 引数と戻り値には型注釈を付けます。
// キーが自由なオブジェクトの型は { [key: string]: number } の形で書きます。
// キーと値を順に見るには Object.entries を使います。
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
