// 問6 すべての要素で predicate が true なら true。空の配列は true
//     例: everyMatch([2, 4], (n) => n % 2 === 0) → true
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// map、filter、find、some、every、reduce などは使わず、for-of や for で回してコールバックを直接呼んでください。

export function everyMatch(numbers: readonly number[], predicate: (n: number) => boolean): boolean {
  for (const n of numbers) {
    if (!predicate(n)) {
      return false;
    }
  }
  return true;
}
