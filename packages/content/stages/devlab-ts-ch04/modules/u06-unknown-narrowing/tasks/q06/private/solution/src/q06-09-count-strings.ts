// 問9 文字列の要素の数を返す
//     例: countStrings(["a", 1, "b", null]) → 2
// 引数と戻り値に型注釈を付けます。
// typeof で値の型を確かめます。
export function countStrings(values: readonly unknown[]): number {
  let count = 0;
  for (const value of values) {
    if (typeof value === "string") {
      count++;
    }
  }
  return count;
}
