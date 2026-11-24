// 問14 a と b の両方にある要素（a の順。重複は1つにする）
//     例: intersection([1, 2, 2, 3], [2, 3, 4]) → [2, 3]
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にし、元の配列は変更しません。

export function intersection<T>(a: readonly T[], b: readonly T[]): T[] {
  const result: T[] = [];
  for (const item of a) {
    if (b.includes(item) && !result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}
