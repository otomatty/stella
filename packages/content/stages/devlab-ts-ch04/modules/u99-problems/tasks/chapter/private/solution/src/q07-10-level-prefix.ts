// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type LogLevel = "debug" | "info" | "warn" | "error";

// 問10
export function levelPrefix(level: LogLevel): string {
  switch (level) {
    case "debug":
      return "[DEBUG]";
    case "info":
      return "[INFO]";
    case "warn":
      return "[WARN]";
    case "error":
      return "[ERROR]";
    default:
      return assertNever(level);
  }
}
