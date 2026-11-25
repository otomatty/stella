// 問16 "3 + 4" のような「数 演算子 数」を計算する。形がおかしければ "式ではありません: <text>"、0 で割れば "0で割ることはできません" の Error
//     例: evaluate("6 / 3") → 2
// 引数と戻り値に型注釈を付けます。
// 文字列を split で区切ります。
// 数値に変換するには Number、有限の数値かの確認には Number.isFinite を使います。
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
