// 問9 fn を n 回呼ぶ。fn には 0 から数えた回数を渡す。何も返さない
//     例: times(3, fn) → fn(0)、fn(1)、fn(2)
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// for で回数を数えながら、コールバックを直接呼んでください。

export function times(n: number, fn: (i: number) => void): void {
  for (let i = 0; i < n; i++) {
    fn(i);
  }
}
