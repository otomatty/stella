// 問16 数を受け取り「数 + unit」の文字列を返す関数を返す
//     例: makeFormatter("kg")(3) → "3kg"
// 引数には型注釈を付け、戻り値の型は (x: number) => number のように書いてください。

export function makeFormatter(unit: string): (n: number) => string {
  return (n) => `${n}${unit}`;
}
