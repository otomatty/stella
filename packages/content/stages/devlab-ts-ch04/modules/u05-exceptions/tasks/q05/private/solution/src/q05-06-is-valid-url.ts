// 問6 URL として読めれば true（new URL(text) を try-catch で囲む）
//     例: isValidUrl("https://example.com") → true
// 引数と戻り値に型注釈を付けます。
export function isValidUrl(text: string): boolean {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}
