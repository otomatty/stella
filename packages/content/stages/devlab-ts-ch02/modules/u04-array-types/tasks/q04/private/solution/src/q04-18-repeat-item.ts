// 問18 item を times 個並べた配列を返す
//     例: repeatItem("x", 3) → ["x", "x", "x"]
// 引数と戻り値には型注釈を付けます。
export function repeatItem(item: string, times: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < times; i++) {
    result.push(item);
  }
  return result;
}
