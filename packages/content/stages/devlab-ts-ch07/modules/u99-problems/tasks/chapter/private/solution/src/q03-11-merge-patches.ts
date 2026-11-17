// 07-q03 Partial・Required・Readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/partial
//       https://typescriptbook.jp/reference/type-reuse/utility-types/required
//       https://typescriptbook.jp/reference/type-reuse/utility-types/readonly

export type Options = { size: number; color: string; bold: boolean };

// 問11
export function mergePatches(...patches: Partial<Options>[]): Partial<Options> {
  let result: Partial<Options> = {};
  for (const patch of patches) {
    result = { ...result, ...patch };
  }
  return result;
}
