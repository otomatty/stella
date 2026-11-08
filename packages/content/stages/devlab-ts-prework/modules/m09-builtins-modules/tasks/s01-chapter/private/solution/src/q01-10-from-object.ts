// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問10
export function fromObject(obj: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(obj));
}
