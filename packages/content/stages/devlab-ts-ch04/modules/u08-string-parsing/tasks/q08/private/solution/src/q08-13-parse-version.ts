// 問13 "1.2.3" を [1, 2, 3] にする。「.」で3つの0以上の整数に分けられなければ "バージョンではありません: <text>" の Error
//     例: parseVersion("1.12.0") → [1, 12, 0]
// 引数と戻り値に型注釈を付けます。
// 文字列を split で区切ります。
// 取り出した数値の文字列は Number で変換します。
export function parseVersion(text: string): [number, number, number] {
  if (!/^\d+\.\d+\.\d+$/.test(text)) {
    throw new Error(`バージョンではありません: ${text}`);
  }
  const [major = 0, minor = 0, patch = 0] = text.split(".").map(Number);
  return [major, minor, patch];
}
