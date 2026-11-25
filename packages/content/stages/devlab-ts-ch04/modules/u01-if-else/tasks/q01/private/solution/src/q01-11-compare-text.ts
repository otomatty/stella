// 問11 a が大きければ "a のほうが大きい"、b が大きければ "b のほうが大きい"、同じなら "同じ"
//     例: compareText(1, 2) → "b のほうが大きい"
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function compareText(a: number, b: number): string {
  if (a > b) {
    return "a のほうが大きい";
  }
  if (a < b) {
    return "b のほうが大きい";
  }
  return "同じ";
}
