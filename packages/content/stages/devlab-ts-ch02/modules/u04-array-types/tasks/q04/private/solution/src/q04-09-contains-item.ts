// 問9 target が含まれていれば true
//     例: containsItem(["a", "b"], "b") → true
// 引数と戻り値には型注釈を付けます。
// 要素が含まれるかの確認には includes が使えます。
export function containsItem(items: readonly string[], target: string): boolean {
  return items.includes(target);
}
