// 問11 unknown の配列から、文字列だけを集めた string[] を返す（filter に型ガード関数を渡すと、結果の型も絞り込まれる）
//     例: onlyStrings(["a", 1, "b"]) → ["a", "b"]
// filter に渡す型ガード関数の戻り値の型は value is string と書いてください。

export function onlyStrings(values: readonly unknown[]): string[] {
  return values.filter((value): value is string => typeof value === "string");
}
