// 問9 fn を最初の1回だけ呼び、2回目からは1回目の結果を返す関数を返す
//     例: const get = onlyOnce(() => 42); get() → 42
// 引数には型注釈を付け、戻り値の型は (x: number) => number のように書いてください。
// 外側の関数に状態を持たせ、返す関数から読み書きしてください。

export function onlyOnce(fn: () => number): () => number {
  let called = false;
  let result = 0;
  return () => {
    if (!called) {
      result = fn();
      called = true;
    }
    return result;
  };
}
