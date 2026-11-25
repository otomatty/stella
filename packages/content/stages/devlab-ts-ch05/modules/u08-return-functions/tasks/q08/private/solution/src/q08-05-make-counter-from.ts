// 問5 呼ぶたびに start、start + 1、… を返す関数を返す
//     例: const next = makeCounterFrom(10); next() → 10、next() → 11
// 引数には型注釈を付け、戻り値の型は (x: number) => number のように書いてください。
// 外側の関数に状態を持たせ、返す関数から読み書きしてください。

export function makeCounterFrom(start: number): () => number {
  let current = start;
  return () => {
    const value = current;
    current++;
    return value;
  };
}
