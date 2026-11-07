// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type LogLevel = "debug" | "info" | "warn" | "error";

// 問11
export function shouldNotify(level: LogLevel): boolean {
  switch (level) {
    case "debug":
    case "info":
      return false;
    case "warn":
    case "error":
      return true;
    default:
      return assertNever(level);
  }
}
