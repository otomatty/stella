// 問9 target が何番目にあるかを返す。なければ null（-1 ではなく）
//     例: indexOrNull(["a", "b"], "c") → null
// 引数と戻り値に型注釈を付ける。

export function indexOrNull(items: readonly string[], target: string): number | null {
  const index = items.indexOf(target);
  return index === -1 ? null : index;
}
