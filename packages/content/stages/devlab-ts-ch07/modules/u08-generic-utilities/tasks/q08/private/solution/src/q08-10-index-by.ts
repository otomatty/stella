// 問10 keyFn(要素) をキーにした Record<string, T>（同じキーは後の方）
//     例: indexBy([{ code: "A" }], (x) => x.code) → { A: { code: "A" } }
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にし、元の配列は変更しません。

export function indexBy<T>(items: readonly T[], keyFn: (item: T) => string): Record<string, T> {
  const result: Record<string, T> = {};
  for (const item of items) {
    result[keyFn(item)] = item;
  }
  return result;
}
