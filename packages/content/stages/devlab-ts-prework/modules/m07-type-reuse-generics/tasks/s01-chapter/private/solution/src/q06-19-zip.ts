// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問19
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
