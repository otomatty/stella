// 問7 すべての数の平均。引数がなければ 0
//     例: averageAll(2, 4, 9) → 5
// 引数と戻り値には型注釈を付けてください。
// 個数が決まっていない引数は、...numbers: number[] のような残余引数で受け取ってください。

export function averageAll(...numbers: number[]): number {
  if (numbers.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return sum / numbers.length;
}
