// 問13 value と同じ要素をすべて除いた新しい配列を返す
//     例: without(["a", "b", "a"], "a") → ["b"]
// 引数と戻り値には型注釈を付けます。
// 残す要素を選ぶには filter が使えます。
export function without(items: readonly string[], value: string): string[] {
  return items.filter((item) => item !== value);
}
