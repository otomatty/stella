// 問9 a か b のどちらかにある要素の Set を返す（a の順の後に、b にだけある要素を b の順に）
//     例: union(Set { 1, 2 }, Set { 2, 3 }) → Set { 1, 2, 3 }
// 引数と戻り値に型注釈を付けます。
// 引数の Set は変更しません。
// Set の要素はスプレッド構文で配列にできます。

export function union(a: Set<number>, b: Set<number>): Set<number> {
  return new Set([...a, ...b]);
}
