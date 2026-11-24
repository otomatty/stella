// 問1 【型ガード】文字列か。戻り値の型は value is string
//     例: isText("a") → true

export function isText(value: unknown): value is string {
  return typeof value === "string";
}
