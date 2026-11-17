// 07-q03 Partial・Required・Readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/partial
//       https://typescriptbook.jp/reference/type-reuse/utility-types/required
//       https://typescriptbook.jp/reference/type-reuse/utility-types/readonly

export type Options = { size: number; color: string; bold: boolean };

// 問10
export function countSet(options: Partial<Options>): number {
  let count = 0;
  if (options.size !== undefined) {
    count++;
  }
  if (options.color !== undefined) {
    count++;
  }
  if (options.bold !== undefined) {
    count++;
  }
  return count;
}
