// 問16 Error なら message、文字列ならそのまま、それ以外は "エラー"
//     例: problemText(new Error("失敗")) → "失敗"
// 引数と戻り値に型注釈を付けます。
// Error かどうかは instanceof Error で確かめます。
export function problemText(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "string") {
    return value;
  }
  return "エラー";
}
