// 問11 a にあって b にない要素の Set を返す（a の順）
//     例: difference(Set { 1, 2, 3 }, Set { 2 }) → Set { 1, 3 }
// 引数と戻り値に型注釈を付けます。
// 引数の Set は変更しません。
// 要素が Set にあるかは has() で調べます。

export function difference(a: Set<number>, b: Set<number>): Set<number> {
  return new Set([...a].filter((n) => !b.has(n)));
}
