// 問1 末尾に item を足した新しい配列を返す
//     例: append(["a", "b"], "c") → ["a", "b", "c"]
// 引数と戻り値には型注釈を付けます。
// スプレッド構文で要素を展開し、新しい配列を作ります。
export function append(items: readonly string[], item: string): string[] {
  return [...items, item];
}
