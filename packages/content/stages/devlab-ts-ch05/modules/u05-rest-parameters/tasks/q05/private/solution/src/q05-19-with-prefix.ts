// 問19 1つ目の引数 prefix を、残りのそれぞれの前に付けた配列を返す
//     例: withPrefix("#", "a", "b") → ["#a", "#b"]
// 引数と戻り値には型注釈を付けてください。
// 個数が決まっていない引数は、...numbers: number[] のような残余引数で受け取ってください。

export function withPrefix(prefix: string, ...items: string[]): string[] {
  return items.map((item) => `${prefix}${item}`);
}
