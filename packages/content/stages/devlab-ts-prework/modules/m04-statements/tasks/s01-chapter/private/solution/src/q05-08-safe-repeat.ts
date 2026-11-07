// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問8
export function safeRepeat(text: string, times: number): string {
  try {
    return text.repeat(times);
  } catch {
    return "";
  }
}
