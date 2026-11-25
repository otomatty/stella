// 問4 最後の要素を除いた新しい配列を返す
//     例: dropLast(["a", "b", "c"]) → ["a", "b"]
// 引数と戻り値には型注釈を付けます。
// 配列の一部を取り出すには slice が使えます。
export function dropLast(items: readonly string[]): string[] {
  return items.slice(0, -1);
}
