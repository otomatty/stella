// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問9
export function decodeOr(text: string, fallback: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return fallback;
  }
}
