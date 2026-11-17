// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard

// 問15
export function toBool(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return value === "true";
}
