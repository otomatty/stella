// 問1 受け取った数に n を足す関数を返す
//     例: makeAdder(3)(4) → 7
// 引数には型注釈を付け、戻り値の型は (x: number) => number のように書いてください。

export function makeAdder(n: number): (x: number) => number {
  return (x) => x + n;
}
