// 問10 Record<string, string> のキーと値を入れ替える
//     例: invertRecord({ a: "x" }) → { x: "a" }
// 引数と戻り値に型注釈を付けます。

export function invertRecord(record: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    result[value] = key;
  }
  return result;
}
