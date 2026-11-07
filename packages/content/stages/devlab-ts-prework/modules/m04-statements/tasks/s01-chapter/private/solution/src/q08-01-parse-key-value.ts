// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問1
export function parseKeyValue(text: string): [string, string] {
  const index = text.indexOf("=");
  if (index === -1) {
    throw new Error(`= がありません: ${text}`);
  }
  return [text.slice(0, index), text.slice(index + 1)];
}
