// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問9
export function parseHexColor(text: string): [number, number, number] {
  if (!/^#[0-9a-fA-F]{6}$/.test(text)) {
    throw new Error(`色ではありません: ${text}`);
  }
  return [
    Number.parseInt(text.slice(1, 3), 16),
    Number.parseInt(text.slice(3, 5), 16),
    Number.parseInt(text.slice(5, 7), 16),
  ];
}
