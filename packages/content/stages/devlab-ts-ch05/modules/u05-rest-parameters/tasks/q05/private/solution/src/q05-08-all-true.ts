// 問8 すべて true なら true。引数がなければ true
//     例: allTrue(true, false) → false
// 引数と戻り値には型注釈を付けてください。
// 個数が決まっていない引数は、...numbers: number[] のような残余引数で受け取ってください。

export function allTrue(...flags: boolean[]): boolean {
  return flags.every((flag) => flag);
}
