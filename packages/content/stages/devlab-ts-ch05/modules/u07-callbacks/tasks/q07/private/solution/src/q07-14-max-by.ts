// 問14 fn の値がいちばん大きい単語を返す。同じなら先の方。空なら undefined
//     例: maxBy(["a", "bcd", "ef"], (w) => w.length) → "bcd"
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// map、filter、find、some、every、reduce などは使わず、for-of や for で回してコールバックを直接呼んでください。

export function maxBy(words: readonly string[], fn: (w: string) => number): string | undefined {
  let best: string | undefined;
  let bestValue = -Infinity;
  for (const word of words) {
    const value = fn(word);
    if (value > bestValue) {
      best = word;
      bestValue = value;
    }
  }
  return best;
}
