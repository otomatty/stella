// 問19 2つの配列の同じ番号どうしを [a, b] のタプルにした配列。長さは短い方に合わせる
//     例: zip([1, 2], ["a", "b", "c"]) → [[1, "a"], [2, "b"]]
// 型変数を使い、unknown で型を置き換えないでください。
// 2 つの配列の引数はそれぞれ readonly A[] と readonly B[] にします。

export function zip<A, B>(a: readonly A[], b: readonly B[]): [A, B][] {
  const result: [A, B][] = [];
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const x = a[i];
    const y = b[i];
    if (x !== undefined && y !== undefined) {
      result.push([x, y]);
    }
  }
  return result;
}
