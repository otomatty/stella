// 問3 【型ガード】真偽値か。戻り値の型は value is boolean
//     例: isBool(false) → true

export function isBool(value: unknown): value is boolean {
  return typeof value === "boolean";
}
