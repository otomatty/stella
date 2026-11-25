// 問6 TypeError なら "TypeError"、RangeError なら "RangeError"、SyntaxError なら "SyntaxError"、それ以外の Error なら "Error"、Error でなければ "unknown" を返す（instanceof で見分ける）
//     例: errorKind(new RangeError("x")) → "RangeError"
// 引数と戻り値に型注釈を付けます。

export function errorKind(error: unknown): string {
  if (error instanceof TypeError) {
    return "TypeError";
  }
  if (error instanceof RangeError) {
    return "RangeError";
  }
  if (error instanceof SyntaxError) {
    return "SyntaxError";
  }
  if (error instanceof Error) {
    return "Error";
  }
  return "unknown";
}
