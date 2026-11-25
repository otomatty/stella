// 問15 value と同じ要素をすべて除いた新しい配列
//     例: withoutValue([1, 2, 1], 1) → [2]
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にします。

export function withoutValue<T>(items: readonly T[], value: T): T[] {
  return items.filter((item) => item !== value);
}
