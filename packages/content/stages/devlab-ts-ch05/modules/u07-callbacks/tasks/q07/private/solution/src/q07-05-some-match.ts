// 問5 predicate が true になる要素が1つでもあれば true
//     例: someMatch([1, 3], (n) => n > 2) → true
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// map、filter、find、some、every、reduce などは使わず、for-of や for で回してコールバックを直接呼んでください。

export function someMatch(numbers: readonly number[], predicate: (n: number) => boolean): boolean {
  for (const n of numbers) {
    if (predicate(n)) {
      return true;
    }
  }
  return false;
}
