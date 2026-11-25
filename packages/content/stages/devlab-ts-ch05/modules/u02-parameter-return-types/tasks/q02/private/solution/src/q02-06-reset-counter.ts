// 問6 counter の count を 0 にする。何も返さない
//     例: resetCounter(counter) → counter.count が 0 になる
// 引数には型注釈を付け、戻り値の型は void と明記してください。

export function resetCounter(counter: { count: number }): void {
  counter.count = 0;
}
