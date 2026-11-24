// 問9 null と undefined を除いた配列。戻り値の型からも null と undefined が消える
//     例: compact([1, null, 2, undefined]) → [1, 2]
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly (T | null | undefined)[] にし、元の配列は変更しません。

export function compact<T>(items: readonly (T | null | undefined)[]): T[] {
  return items.filter((item): item is T => item !== null && item !== undefined);
}
