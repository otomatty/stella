// 問6 2つとも数値なら足した数、そうでなければ null
//     例: addIfNumbers(1, "2") → null
// 引数と戻り値に型注釈を付けます。
// typeof で値の型を確かめます。
export function addIfNumbers(a: unknown, b: unknown): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a + b;
  }
  return null;
}
