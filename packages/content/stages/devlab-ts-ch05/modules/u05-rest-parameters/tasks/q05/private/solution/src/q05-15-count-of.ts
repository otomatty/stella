// 問15 1つ目の引数 target が、残りの中にいくつあるかを返す
//     例: countOf("a", "a", "b", "a") → 2
// 引数と戻り値には型注釈を付けてください。
// 個数が決まっていない引数は、...numbers: number[] のような残余引数で受け取ってください。

export function countOf(target: string, ...items: string[]): number {
  return items.filter((item) => item === target).length;
}
