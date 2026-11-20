// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard

// 問6
export function addIfNumbers(a: unknown, b: unknown): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a + b;
  }
  return null;
}
