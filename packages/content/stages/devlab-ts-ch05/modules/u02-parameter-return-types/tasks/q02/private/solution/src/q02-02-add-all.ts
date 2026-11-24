// 問2 target の末尾に values をすべて足す。何も返さない
//     例: addAll(target, [1, 2]) → target の末尾に 1, 2 が足される
// 引数には型注釈を付け、戻り値の型は void と明記してください。

export function addAll(target: number[], values: readonly number[]): void {
  for (const value of values) {
    target.push(value);
  }
}
