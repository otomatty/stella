// 問17 文字列と数値が混ざった配列から、数値だけを集める
//     例: pickNumbers([1, "a", 2]) → [1, 2]
// 引数と戻り値には型注釈を付けてください。

export function pickNumbers(values: readonly (string | number)[]): number[] {
  const result: number[] = [];
  for (const value of values) {
    if (typeof value === "number") {
      result.push(value);
    }
  }
  return result;
}
