// 問17 数を受け取り、min 以上 max 以下なら true を返す関数を返す
//     例: makeValidator(1, 10)(11) → false
// 引数には型注釈を付け、戻り値の型は (x: number) => number のように書いてください。

export function makeValidator(min: number, max: number): (n: number) => boolean {
  return (n) => n >= min && n <= max;
}
