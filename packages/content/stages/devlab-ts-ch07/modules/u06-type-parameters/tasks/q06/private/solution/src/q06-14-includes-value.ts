// 問14 value が含まれていれば true
//     例: includesValue([1, 2], 2) → true
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にします。

export function includesValue<T>(items: readonly T[], value: T): boolean {
  return items.includes(value);
}
