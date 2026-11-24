// 問20 順番と重複を無視して、a と b が同じ要素の集まりなら true
//     例: sameMembers(["a", "b", "a"], ["b", "a"]) → true
// 引数と戻り値に型注釈を付けます。
// 重複や要素の有無を調べるために Set を使います。
// 引数の配列は変更しません。
// 要素が Set にあるかは has() で調べます。

export function sameMembers(a: string[], b: string[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  return setA.size === setB.size && [...setA].every((item) => setB.has(item));
}
