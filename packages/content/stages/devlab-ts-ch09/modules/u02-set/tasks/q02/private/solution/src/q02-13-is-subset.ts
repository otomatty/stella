// 問13 a の要素がすべて b にあれば true（a が空なら true）
//     例: isSubset(Set { 1, 2 }, Set { 1, 2, 3 }) → true
// 引数と戻り値に型注釈を付けます。
// 引数の Set は変更しません。
// 要素が Set にあるかは has() で調べます。

export function isSubset(a: Set<number>, b: Set<number>): boolean {
  return [...a].every((n) => b.has(n));
}
