// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問7
export function hostOf(text: string): string {
  try {
    return new URL(text).hostname;
  } catch {
    return "";
  }
}
