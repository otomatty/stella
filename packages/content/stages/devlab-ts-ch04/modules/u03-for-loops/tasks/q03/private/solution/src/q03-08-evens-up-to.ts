// 問8 0 以上 n 以下の偶数を並べた配列を返す（for 文で 2 ずつ増やす）
//     例: evensUpTo(7) → [0, 2, 4, 6]
// 引数と戻り値に型注釈を付けます。
// map や filter などでループを置き換えないでください。
export function evensUpTo(n: number): number[] {
  const result: number[] = [];
  for (let i = 0; i <= n; i += 2) {
    result.push(i);
  }
  return result;
}
