// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問15
export function parseOperator(text: string): "+" | "-" | "*" | "/" {
  if (text === "+" || text === "-" || text === "*" || text === "/") {
    return text;
  }
  throw new Error(`演算子ではありません: ${text}`);
}
