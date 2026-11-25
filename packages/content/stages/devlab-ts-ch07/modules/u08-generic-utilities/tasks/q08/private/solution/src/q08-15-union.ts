// 問15 a と b のどちらかにある要素を、出てきた順に重複なく並べる
//     例: union([1, 2], [2, 3]) → [1, 2, 3]
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にし、元の配列は変更しません。

export function union<T>(a: readonly T[], b: readonly T[]): T[] {
  const result: T[] = [];
  for (const item of [...a, ...b]) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}
