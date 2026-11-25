// 問8 "3-7" を [3, 7] にする。数値でないか、始まりが終わりより大きければ "範囲ではありません: <text>" の Error
//     例: parseRange("3-7") → [3, 7]
// 引数と戻り値に型注釈を付けます。
// 文字列を split で区切ります。
// 数値に変換するには Number、有限の数値かの確認には Number.isFinite を使います。
export function parseRange(text: string): [number, number] {
  const parts = text.split("-");
  const start = Number(parts[0]);
  const end = Number(parts[1]);
  if (parts.length !== 2 || !Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    throw new Error(`範囲ではありません: ${text}`);
  }
  return [start, end];
}
