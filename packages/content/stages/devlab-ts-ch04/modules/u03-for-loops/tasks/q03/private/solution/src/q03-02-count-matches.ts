// 問2 target と同じ要素の数を返す
//     例: countMatches(["a", "b", "a"], "a") → 2
// 引数と戻り値に型注釈を付けます。
// for 文か for-of 文で回します。map や filter などでループを置き換えないでください。
export function countMatches(items: readonly string[], target: string): number {
  let count = 0;
  for (const item of items) {
    if (item === target) {
      count++;
    }
  }
  return count;
}
