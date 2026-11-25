// 問15 真偽値ならそのまま、文字列 "true" なら true、それ以外は false
//     例: toBool("true") → true
// 引数と戻り値に型注釈を付けます。
// typeof で値の型を確かめます。
export function toBool(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return value === "true";
}
