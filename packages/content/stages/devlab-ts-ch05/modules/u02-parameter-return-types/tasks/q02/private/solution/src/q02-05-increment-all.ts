// 問5 すべての要素を1増やす（配列そのものを書き換える）。何も返さない
//     例: incrementAll(counts) → [1, 2] が [2, 3] になる
// 引数には型注釈を付け、戻り値の型は void と明記してください。

export function incrementAll(counts: number[]): void {
  for (let i = 0; i < counts.length; i++) {
    counts[i] = (counts[i] ?? 0) + 1;
  }
}
