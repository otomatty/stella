// 問2 a ÷ b を返す。b が 0 なら "0で割ることはできません" の Error を投げる
//     例: divide(6, 3) → 2
// 引数と戻り値に型注釈を付けます。
// 例外は throw new Error("メッセージ") で投げます。
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("0で割ることはできません");
  }
  return a / b;
}
