// 問13 target と同じ要素の数（=== で比べる）
//     例: countOf(["a", "b", "a"], "a") → 2
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にします。

export function countOf<T>(items: readonly T[], target: T): number {
  let count = 0;
  for (const item of items) {
    if (item === target) {
      count++;
    }
  }
  return count;
}
