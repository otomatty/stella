// 問6 n が base の倍数なら true を返す
//     例: isMultipleOf(12, 4) → true
// 戻り値には型注釈を付けてください。
export function isMultipleOf(n: number, base: number): boolean {
  return n % base === 0;
}
