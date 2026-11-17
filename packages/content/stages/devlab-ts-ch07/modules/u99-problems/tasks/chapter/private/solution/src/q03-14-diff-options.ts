// 07-q03 Partial・Required・Readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/partial
//       https://typescriptbook.jp/reference/type-reuse/utility-types/required
//       https://typescriptbook.jp/reference/type-reuse/utility-types/readonly

export type Options = { size: number; color: string; bold: boolean };

// 問14
export function diffOptions(a: Options, b: Options): Partial<Options> {
  const result: Partial<Options> = {};
  if (a.size !== b.size) {
    result.size = b.size;
  }
  if (a.color !== b.color) {
    result.color = b.color;
  }
  if (a.bold !== b.bold) {
    result.bold = b.bold;
  }
  return result;
}
