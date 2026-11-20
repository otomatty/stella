// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type LogLevel = "debug" | "info" | "warn" | "error";

// 問15
export function countByLevel(levels: readonly LogLevel[]): {
  debug: number;
  info: number;
  warn: number;
  error: number;
} {
  const counts = { debug: 0, info: 0, warn: 0, error: 0 };
  for (const level of levels) {
    switch (level) {
      case "debug":
        counts.debug++;
        break;
      case "info":
        counts.info++;
        break;
      case "warn":
        counts.warn++;
        break;
      case "error":
        counts.error++;
        break;
      default:
        assertNever(level);
    }
  }
  return counts;
}
