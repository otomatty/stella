// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問16
export function evaluate(text: string): number {
  const [a, op, b, ...rest] = text.trim().split(/\s+/);
  const x = Number(a);
  const y = Number(b);
  if (
    rest.length > 0 ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    a === undefined ||
    b === undefined
  ) {
    throw new Error(`式ではありません: ${text}`);
  }
  switch (op ?? "") {
    case "+":
      return x + y;
    case "-":
      return x - y;
    case "*":
      return x * y;
    case "/":
      if (y === 0) {
        throw new Error("0で割ることはできません");
      }
      return x / y;
    default:
      throw new Error(`式ではありません: ${text}`);
  }
}
