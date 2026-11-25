// 問8 items の i 番目と j 番目を入れ替える（配列そのものを書き換える）。範囲外なら Error を投げる。何も返さない
//     例: swapInPlace(items, 0, 2) → ["a", "b", "c"] が ["c", "b", "a"] になる
// 引数には型注釈を付け、戻り値の型は void と明記してください。

export function swapInPlace(items: string[], i: number, j: number): void {
  const a = items[i];
  const b = items[j];
  if (a === undefined || b === undefined) {
    throw new Error("範囲外です");
  }
  items[i] = b;
  items[j] = a;
}
