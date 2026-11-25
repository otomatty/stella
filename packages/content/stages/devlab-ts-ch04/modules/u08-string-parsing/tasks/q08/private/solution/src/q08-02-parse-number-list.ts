// 問2 "1,2,3" を [1, 2, 3] にする。前後の空白は無視する。数値でないものがあれば "数値ではありません: <その部分>" の Error を投げる
//     例: parseNumberList("1, 2,3") → [1, 2, 3]
// 引数と戻り値に型注釈を付けます。
// 文字列を split で区切ります。
// 数値に変換するには Number、有限の数値かの確認には Number.isFinite を使います。
export function parseNumberList(text: string): number[] {
  const result: number[] = [];
  for (const part of text.split(",")) {
    const trimmed = part.trim();
    const n = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(n)) {
      throw new Error(`数値ではありません: ${trimmed}`);
    }
    result.push(n);
  }
  return result;
}
