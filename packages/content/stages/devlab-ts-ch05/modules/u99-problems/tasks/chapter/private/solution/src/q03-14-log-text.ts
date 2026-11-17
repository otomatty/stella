// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問14
export function logText(message: string, level?: "info" | "warn"): string {
  return `[${(level ?? "info").toUpperCase()}] ${message}`;
}
