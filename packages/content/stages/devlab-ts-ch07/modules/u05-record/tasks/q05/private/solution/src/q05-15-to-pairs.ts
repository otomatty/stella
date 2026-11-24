// 問15 Record<string, number> を [キー, 値] の配列にする
//     例: toPairs({ a: 1, b: 2 }) → [["a", 1], ["b", 2]]
// 引数と戻り値に型注釈を付けます。

export function toPairs(record: Record<string, number>): [string, number][] {
  return Object.entries(record);
}
