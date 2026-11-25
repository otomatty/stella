// 問5 "2026-12-01" を [2026, 12, 1] にする。「-」で3つに分けられないか、整数でなければ "日付ではありません: <text>" の Error
//     例: parseDateParts("2026-12-01") → [2026, 12, 1]
// 引数と戻り値に型注釈を付けます。
// 文字列を split で区切ります。
// Number で数値に変換し、Number.isInteger で整数か確かめます。
export function parseDateParts(text: string): [number, number, number] {
  const parts = text.split("-");
  const [y, m, d] = parts.map(Number);
  if (
    parts.length !== 3 ||
    y === undefined ||
    m === undefined ||
    d === undefined ||
    !Number.isInteger(y) ||
    !Number.isInteger(m) ||
    !Number.isInteger(d)
  ) {
    throw new Error(`日付ではありません: ${text}`);
  }
  return [y, m, d];
}
