// 問15 値がいちばん大きいキーを返す。同じ値なら先に入ったほう。空なら undefined
//     例: topName(Map { "山田" => 80, "佐藤" => 95 }) → "佐藤"
// 引数と戻り値に型注釈を付けます。
// Map の entries() で入れた順に取り出します。

export function topName(scores: Map<string, number>): string | undefined {
  let best: [string, number] | undefined;
  for (const entry of scores) {
    if (best === undefined || entry[1] > best[1]) {
      best = entry;
    }
  }
  return best?.[0];
}
