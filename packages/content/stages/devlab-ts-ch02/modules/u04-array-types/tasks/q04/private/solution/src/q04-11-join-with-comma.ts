// 問11 要素を「, 」でつないだ文字列を返す
//     例: joinWithComma(["a", "b", "c"]) → "a, b, c"
// 引数と戻り値には型注釈を付けます。
// 要素をつなぐには join が使えます。
export function joinWithComma(items: readonly string[]): string {
  return items.join(", ");
}
