// 問8 配列の配列を1つの配列にする
//     例: flattenOnce([[1], [2, 3]]) → [1, 2, 3]
// 型変数を使い、unknown で型を置き換えないでください。
// 外側と内側の配列をどちらも readonly にし、元の配列は変更しません。

export function flattenOnce<T>(nested: readonly (readonly T[])[]): T[] {
  const result: T[] = [];
  for (const inner of nested) {
    result.push(...inner);
  }
  return result;
}
