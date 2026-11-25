// 問7 URL のホスト名（new URL(text).hostname）を返す。URL として読めなければ空の文字列
//     例: hostOf("https://example.com/path") → "example.com"
// 引数と戻り値に型注釈を付けます。
// new URL(text) を try-catch で囲みます。
export function hostOf(text: string): string {
  try {
    return new URL(text).hostname;
  } catch {
    return "";
  }
}
