// 問18 【型ガード】「@」を含む文字列か。戻り値の型は value is string
//     例: isEmailLike("a@example.com") → true

export function isEmailLike(value: unknown): value is string {
  return typeof value === "string" && value.includes("@");
}
