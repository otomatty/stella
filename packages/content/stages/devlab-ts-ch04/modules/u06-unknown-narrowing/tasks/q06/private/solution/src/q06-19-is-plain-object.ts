// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard

// 問19
export function isPlainObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
