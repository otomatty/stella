// 問15 RangeError なら true
//     例: isRangeError(new RangeError("x")) → true
// 引数と戻り値に型注釈を付けます。
// instanceof RangeError で判定します。
export function isRangeError(error: unknown): boolean {
  return error instanceof RangeError;
}
