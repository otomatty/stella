// 問8 値の合計を返す
//     例: totalScore(scores) → 145
// 引数と戻り値に型注釈を付けます。
// Map の values() で値を取り出します。

export function totalScore(scores: Map<string, number>): number {
  let total = 0;
  for (const score of scores.values()) {
    total += score;
  }
  return total;
}
