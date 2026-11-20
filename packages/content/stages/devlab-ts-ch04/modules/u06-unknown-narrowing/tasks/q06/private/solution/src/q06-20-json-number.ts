// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard

// 問20
export function jsonNumber(text: string): number | null {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}
