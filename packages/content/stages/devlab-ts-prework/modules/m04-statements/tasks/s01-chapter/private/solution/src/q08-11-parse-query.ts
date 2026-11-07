// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問11
export function parseQuery(text: string): { [key: string]: string } {
  const result: { [key: string]: string } = {};
  if (text === "") {
    return result;
  }
  for (const pair of text.split("&")) {
    const index = pair.indexOf("=");
    if (index === -1) {
      result[pair] = "";
    } else {
      result[pair.slice(0, index)] = pair.slice(index + 1);
    }
  }
  return result;
}
