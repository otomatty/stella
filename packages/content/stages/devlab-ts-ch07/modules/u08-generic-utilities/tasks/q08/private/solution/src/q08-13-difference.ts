// 問13 a にあって b にない要素（a の順）
//     例: difference([1, 2, 3], [2]) → [1, 3]
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にし、元の配列は変更しません。

export function difference<T>(a: readonly T[], b: readonly T[]): T[] {
  return a.filter((item) => !b.includes(item));
}
