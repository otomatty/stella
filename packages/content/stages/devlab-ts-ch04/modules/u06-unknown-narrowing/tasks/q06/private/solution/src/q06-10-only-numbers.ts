// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard

// 問10
export function onlyNumbers(values: readonly unknown[]): number[] {
  const result: number[] = [];
  for (const value of values) {
    if (typeof value === "number") {
      result.push(value);
    }
  }
  return result;
}
