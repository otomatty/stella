// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard

// 問3
export function numberOrZero(value: unknown): number {
  return typeof value === "number" ? value : 0;
}
