// 問15 key の値の小さい順に並べた新しい配列を返す（同じなら元の順）。[...words].sort を使ってよい
//     例: sortByKey(["ccc", "a", "bb"], (w) => w.length) → ["a", "bb", "ccc"]
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// sort の比較関数の中で key を直接呼んでください。

export function sortByKey(words: readonly string[], key: (w: string) => number): string[] {
  return [...words].sort((a, b) => key(a) - key(b));
}
