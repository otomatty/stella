// 問10 文字列を Number で数値にする。NaN になるなら null
//     例: parseOrNull("abc") → null
// 引数と戻り値に型注釈を付ける。

export function parseOrNull(text: string): number | null {
  const value = Number(text);
  return Number.isNaN(value) ? null : value;
}
