// 問2 name の点数を返す。なければ 0
//     例: scoreOf(scores, "鈴木") → 0
// 引数と戻り値に型注釈を付けます。

export function scoreOf(scores: Map<string, number>, name: string): number {
  return scores.get(name) ?? 0;
}
