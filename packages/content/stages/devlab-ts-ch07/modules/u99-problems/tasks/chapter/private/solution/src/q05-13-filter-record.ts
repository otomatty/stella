// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

// 問13
export function filterRecord(record: Record<string, number>, min: number): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value >= min) {
      result[key] = value;
    }
  }
  return result;
}
