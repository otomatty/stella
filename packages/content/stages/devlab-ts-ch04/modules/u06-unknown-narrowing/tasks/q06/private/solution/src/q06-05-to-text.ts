// 問5 文字列はそのまま、数値と真偽値は String で文字列に、null は "null"、undefined は "undefined"、それ以外は "[object]"
//     例: toText(true) → "true"
// 引数と戻り値に型注釈を付けます。
export function toText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  return "[object]";
}
