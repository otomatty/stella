// 問9 decodeURIComponent(text) を返す。例外が出たら fallback を返す
//     例: decodeOr("%E3%81%82", "?") → "あ"
// 引数と戻り値に型注釈を付けます。
// decodeURIComponent(text) を try-catch で囲みます。
export function decodeOr(text: string, fallback: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return fallback;
  }
}
