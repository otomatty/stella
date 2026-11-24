// 問3 1つ以上の数の最小値
//     例: smallest(3, 9, 2) → 2
// 引数と戻り値には型注釈を付けてください。
// 1つ目は普通の引数にし、残りは ...rest: number[] のような残余引数で受け取ってください。

export function smallest(first: number, ...rest: number[]): number {
  return Math.min(first, ...rest);
}
