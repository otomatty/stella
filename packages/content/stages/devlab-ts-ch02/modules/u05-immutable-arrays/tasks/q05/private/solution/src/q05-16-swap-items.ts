// 問16 i 番目と j 番目を入れ替えた新しい配列を返す。どちらかが範囲外なら Error を投げる
//     例: swapItems(["a", "b", "c"], 0, 2) → ["c", "b", "a"]
// 引数と戻り値には型注釈を付けます。
// [...配列] でコピーしてから要素を入れ替えます。
export function swapItems(items: readonly string[], i: number, j: number): string[] {
  const a = items[i];
  const b = items[j];
  if (a === undefined || b === undefined) {
    throw new Error("範囲外です");
  }
  const copied = [...items];
  copied[i] = b;
  copied[j] = a;
  return copied;
}
