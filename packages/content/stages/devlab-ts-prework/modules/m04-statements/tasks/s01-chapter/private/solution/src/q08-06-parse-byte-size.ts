// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問6
export function parseByteSize(text: string): number {
  const match = /^(\d+)(B|KB|MB)$/.exec(text);
  if (match === null) {
    throw new Error(`大きさではありません: ${text}`);
  }
  const value = Number(match[1]);
  switch (match[2] ?? "") {
    case "KB":
      return value * 1024;
    case "MB":
      return value * 1024 * 1024;
    default:
      return value;
  }
}
