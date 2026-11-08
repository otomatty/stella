// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard

// 問9
export function countStrings(values: readonly unknown[]): number {
  let count = 0;
  for (const value of values) {
    if (typeof value === "string") {
      count++;
    }
  }
  return count;
}
