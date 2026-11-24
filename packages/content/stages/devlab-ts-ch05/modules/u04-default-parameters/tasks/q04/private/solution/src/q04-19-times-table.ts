// 問19 n × 1 から n × upTo までを並べた配列を返す。upTo を省略したら 9
//     例: timesTable(2, 3) → [2, 4, 6]
// 省略時の値は、引数に times = 2 のように書いてください。
// 必須の引数と戻り値には型注釈を付けてください。

export function timesTable(n: number, upTo = 9): number[] {
  const result: number[] = [];
  for (let i = 1; i <= upTo; i++) {
    result.push(n * i);
  }
  return result;
}
