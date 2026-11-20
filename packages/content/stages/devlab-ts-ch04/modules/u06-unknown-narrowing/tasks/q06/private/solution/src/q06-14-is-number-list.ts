// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard

// 問14
export function isNumberList(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }
  const items: readonly unknown[] = value;
  for (const item of items) {
    if (typeof item !== "number") {
      return false;
    }
  }
  return true;
}
