// 問20 前後の空白を取り除いた文字列を返す。空になるなら "空です" の Error を投げる
//     例: requireText("  a ") → "a"
// 引数と戻り値に型注釈を付けます。
// 例外は throw new Error("メッセージ") で投げます。
export function requireText(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") {
    throw new Error("空です");
  }
  return trimmed;
}
