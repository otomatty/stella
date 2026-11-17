// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問7
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
