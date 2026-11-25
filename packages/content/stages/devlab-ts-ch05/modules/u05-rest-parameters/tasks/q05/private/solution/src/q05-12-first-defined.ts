// 問12 undefined でない最初の値を返す。なければ undefined
//     例: firstDefined(undefined, "a", "b") → "a"
// 引数と戻り値には型注釈を付けてください。
// 個数が決まっていない引数は、...numbers: number[] のような残余引数で受け取ってください。

export function firstDefined(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}
