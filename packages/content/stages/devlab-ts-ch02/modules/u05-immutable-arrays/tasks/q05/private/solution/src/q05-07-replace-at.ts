// 問7 index 番目の要素を item に置き換えた新しい配列を返す
//     例: replaceAt(["a", "b", "c"], 1, "x") → ["a", "x", "c"]
// 引数と戻り値には型注釈を付けます。
// 指定の位置だけ変更した配列を作るには map が使えます。
export function replaceAt(items: readonly string[], index: number, item: string): string[] {
  return items.map((value, i) => (i === index ? item : value));
}
