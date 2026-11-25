// 問3 先頭の要素を除いた新しい配列を返す
//     例: dropFirst(["a", "b", "c"]) → ["b", "c"]
// 引数と戻り値には型注釈を付けます。
// 配列の一部を取り出すには slice が使えます。
export function dropFirst(items: readonly string[]): string[] {
  return items.slice(1);
}
