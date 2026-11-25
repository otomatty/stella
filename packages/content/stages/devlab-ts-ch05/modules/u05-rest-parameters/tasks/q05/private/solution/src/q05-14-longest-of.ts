// 問14 いちばん長い文字列を返す。同じ長さなら先の方。引数がなければ空の文字列
//     例: longestOf("a", "abc", "ab") → "abc"
// 引数と戻り値には型注釈を付けてください。
// 個数が決まっていない引数は、...numbers: number[] のような残余引数で受け取ってください。

export function longestOf(...words: string[]): string {
  let longest = "";
  for (const word of words) {
    if (word.length > longest.length) {
      longest = word;
    }
  }
  return longest;
}
