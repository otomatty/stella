// 問6 呼ぶたびに真偽値を反転し、反転した後の値を返す関数を返す
//     例: const toggle = makeToggle(false); toggle() → true、toggle() → false
// 引数には型注釈を付け、戻り値の型は (x: number) => number のように書いてください。
// 外側の関数に状態を持たせ、返す関数から読み書きしてください。

export function makeToggle(initial: boolean): () => boolean {
  let state = initial;
  return () => {
    state = !state;
    return state;
  };
}
