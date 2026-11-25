// 問3 predicate が true の配列と false の配列に分ける。戻り値は [T[], T[]]
//     例: splitBy([1, 2, 3], (n) => n > 1) → [[2, 3], [1]]
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にし、元の配列は変更しません。

export function splitBy<T>(items: readonly T[], predicate: (item: T) => boolean): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  for (const item of items) {
    if (predicate(item)) {
      yes.push(item);
    } else {
      no.push(item);
    }
  }
  return [yes, no];
}
