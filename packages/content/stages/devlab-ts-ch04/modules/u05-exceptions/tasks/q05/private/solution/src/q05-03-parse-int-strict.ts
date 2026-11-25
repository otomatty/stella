// 問3 整数だけを表す文字列（例: "-12"）を数値にする。そうでなければ "整数ではありません: <text>" の Error を投げる（正規表現 /^-?\d+$/ を使う）
//     例: parseIntStrict("42") → 42
// 引数と戻り値に型注釈を付けます。
// 例外は throw new Error("メッセージ") で投げます。
export function parseIntStrict(text: string): number {
  if (!/^-?\d+$/.test(text)) {
    throw new Error(`整数ではありません: ${text}`);
  }
  return Number(text);
}
