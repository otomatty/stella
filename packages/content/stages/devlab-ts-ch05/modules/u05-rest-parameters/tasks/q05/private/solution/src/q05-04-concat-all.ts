// 問4 すべての文字列をつなぐ
//     例: concatAll("a", "b", "c") → "abc"
// 引数と戻り値には型注釈を付けてください。
// 個数が決まっていない引数は、...numbers: number[] のような残余引数で受け取ってください。

export function concatAll(...texts: string[]): string {
  return texts.join("");
}
