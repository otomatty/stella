// 問10 "50%" を 0.5 にする。「%」で終わっていないか、数値でなければ "割合ではありません: <text>" の Error
//     例: parseRatio("50%") → 0.5
// 引数と戻り値に型注釈を付けます。
// 必要な部分を slice で取り出します。
// 数値に変換するには Number、有限の数値かの確認には Number.isFinite を使います。
export function parseRatio(text: string): number {
  const value = Number(text.slice(0, -1));
  if (!text.endsWith("%") || text.length < 2 || !Number.isFinite(value)) {
    throw new Error(`割合ではありません: ${text}`);
  }
  return value / 100;
}
