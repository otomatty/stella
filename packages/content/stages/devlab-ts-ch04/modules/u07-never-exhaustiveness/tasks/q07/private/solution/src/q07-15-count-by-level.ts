// 問15 ログの重要度ごとの数を { debug, info, warn, error } で返す（switch で数える）
//     例: countByLevel(["info", "warn", "info"]) → { debug: 0, info: 2, warn: 1, error: 0 }
// 引数と戻り値に型注釈を付けます。
// switch の default で、用意されている assertNever を呼びます。
export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type LogLevel = "debug" | "info" | "warn" | "error";

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
