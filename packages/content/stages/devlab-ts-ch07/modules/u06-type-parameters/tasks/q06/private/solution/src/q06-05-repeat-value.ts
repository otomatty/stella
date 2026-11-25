// 問5 value を times 個並べた配列
//     例: repeatValue("x", 3) → ["x", "x", "x"]
// 型変数を使い、unknown で型を置き換えないでください。

export function repeatValue<T>(value: T, times: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < times; i++) {
    result.push(value);
  }
  return result;
}
