// 問13 値が min 以上のものだけを残した、新しい Record<string, number> を返す
//     例: filterRecord({ a: 1, b: 5 }, 3) → { b: 5 }
// 引数と戻り値に型注釈を付けます。

export function filterRecord(record: Record<string, number>, min: number): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value >= min) {
      result[key] = value;
    }
  }
  return result;
}
