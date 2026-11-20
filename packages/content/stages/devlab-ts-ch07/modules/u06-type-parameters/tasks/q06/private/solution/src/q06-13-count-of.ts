// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問13
export function countOf<T>(items: readonly T[], target: T): number {
  let count = 0;
  for (const item of items) {
    if (item === target) {
      count++;
    }
  }
  return count;
}
