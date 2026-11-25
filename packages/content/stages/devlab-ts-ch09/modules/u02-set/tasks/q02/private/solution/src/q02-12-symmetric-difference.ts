// 問12 a と b のどちらか一方にだけある要素の Set を返す（a にだけあるものを a の順に、その後に b にだけあるものを b の順に）
//     例: symmetricDifference(Set { 1, 2 }, Set { 2, 3 }) → Set { 1, 3 }
// 引数と戻り値に型注釈を付けます。
// 引数の Set は変更しません。
// 要素が Set にあるかは has() で調べます。

export function symmetricDifference(a: Set<number>, b: Set<number>): Set<number> {
  return new Set([...[...a].filter((n) => !b.has(n)), ...[...b].filter((n) => !a.has(n))]);
}
