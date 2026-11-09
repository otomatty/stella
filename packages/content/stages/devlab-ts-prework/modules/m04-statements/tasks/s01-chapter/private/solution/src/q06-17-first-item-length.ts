// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard

// 問17
export function firstItemLength(value: unknown): number {
  if (Array.isArray(value)) {
    const first: unknown = value[0];
    if (typeof first === "string") {
      return first.length;
    }
  }
  return 0;
}
