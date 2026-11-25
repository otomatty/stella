// 問17 a が小さければ -1、等しければ 0、大きければ 1 を返す
//     例: compare(2, 5) → -1
// 引数や戻り値が決まった値だけを取る場合は、リテラル型を | でつないで型注釈を書いてください。
export function compare(a: number, b: number): -1 | 0 | 1 {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}
