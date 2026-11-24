// 問7 2つの配列の同じ番号どうしを fn で組み合わせた配列。長さは短い方に合わせる（型変数を3つ使う）
//     例: zipWith([1, 2], ["a", "b"], (n, s) => `${s}${n}`) → ["a1", "b2"]
// 型変数を unknown で置き換えないでください。
// 2 つの配列の引数はそれぞれ readonly A[] と readonly B[] にし、元の配列は変更しません。

export function zipWith<A, B, C>(a: readonly A[], b: readonly B[], fn: (a: A, b: B) => C): C[] {
  const result: C[] = [];
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const x = a[i];
    const y = b[i];
    if (x !== undefined && y !== undefined) {
      result.push(fn(x, y));
    }
  }
  return result;
}
