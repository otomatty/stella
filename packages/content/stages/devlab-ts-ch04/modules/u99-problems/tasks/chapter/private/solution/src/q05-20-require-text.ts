// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問20
export function requireText(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") {
    throw new Error("空です");
  }
  return trimmed;
}
