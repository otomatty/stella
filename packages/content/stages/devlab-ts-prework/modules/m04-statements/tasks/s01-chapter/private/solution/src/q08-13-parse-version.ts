// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問13
export function parseVersion(text: string): [number, number, number] {
  if (!/^\d+\.\d+\.\d+$/.test(text)) {
    throw new Error(`バージョンではありません: ${text}`);
  }
  const [major = 0, minor = 0, patch = 0] = text.split(".").map(Number);
  return [major, minor, patch];
}
