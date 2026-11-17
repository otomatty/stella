// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問17
export function commandName(text: string): string {
  const first = text.trim().split(/\s+/)[0] ?? "";
  if (first === "") {
    throw new Error("コマンドがありません");
  }
  return first.toLowerCase();
}
