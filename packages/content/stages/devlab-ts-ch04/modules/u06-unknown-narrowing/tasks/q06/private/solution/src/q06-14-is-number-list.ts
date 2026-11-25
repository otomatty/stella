// 問14 配列で、すべての要素が数値なら true
//     例: isNumberList([1, 2]) → true
// 引数と戻り値に型注釈を付けます。
// 配列かどうかは Array.isArray で確かめます。
export function isNumberList(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }
  const items: readonly unknown[] = value;
  for (const item of items) {
    if (typeof item !== "number") {
      return false;
    }
  }
  return true;
}
