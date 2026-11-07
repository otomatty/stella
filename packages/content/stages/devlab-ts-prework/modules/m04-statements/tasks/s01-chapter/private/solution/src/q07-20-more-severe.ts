// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export type LogLevel = "debug" | "info" | "warn" | "error";

// 問20
export function moreSevere(a: LogLevel, b: LogLevel): LogLevel {
  const order: LogLevel[] = ["debug", "info", "warn", "error"];
  return order.indexOf(b) > order.indexOf(a) ? b : a;
}
