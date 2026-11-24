// 問17 start 以上 end 未満の整数を順に並べた配列を返す（for 文と push）
//     例: range(2, 5) → [2, 3, 4]
// 引数と戻り値には型注釈を付けます。
export function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i++) {
    result.push(i);
  }
  return result;
}
