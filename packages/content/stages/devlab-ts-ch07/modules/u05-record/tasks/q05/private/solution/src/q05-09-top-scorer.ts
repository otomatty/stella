// 問9 Record<string, number> の得点表から、最高得点の人を返す。同点なら先に出てきた人。空なら undefined
//     例: topScorer({ 山田: 70, 佐藤: 90 }) → "佐藤"
// 引数と戻り値に型注釈を付けます。

export function topScorer(scores: Record<string, number>): string | undefined {
  let top: string | undefined;
  let best = -Infinity;
  for (const [name, score] of Object.entries(scores)) {
    if (score > best) {
      top = name;
      best = score;
    }
  }
  return top;
}
