// 問2 文字列か配列なら length、それ以外は 0
//     例: lengthOf([1, 2, 3]) → 3
// 引数と戻り値に型注釈を付けます。
// 配列かどうかは Array.isArray で確かめます。
export function lengthOf(value: unknown): number {
  if (typeof value === "string" || Array.isArray(value)) {
    return value.length;
  }
  return 0;
}
