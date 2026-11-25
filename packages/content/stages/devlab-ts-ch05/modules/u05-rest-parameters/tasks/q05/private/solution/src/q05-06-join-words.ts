// 問6 1つ目の引数 separator で、残りの単語をつなぐ
//     例: joinWords("-", "a", "b", "c") → "a-b-c"
// 引数と戻り値には型注釈を付けてください。
// 個数が決まっていない引数は、...numbers: number[] のような残余引数で受け取ってください。

export function joinWords(separator: string, ...words: string[]): string {
  return words.join(separator);
}
