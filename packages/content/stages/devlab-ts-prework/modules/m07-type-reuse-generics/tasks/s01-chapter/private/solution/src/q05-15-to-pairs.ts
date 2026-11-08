// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

// 問15
export function toPairs(record: Record<string, number>): [string, number][] {
  return Object.entries(record);
}
