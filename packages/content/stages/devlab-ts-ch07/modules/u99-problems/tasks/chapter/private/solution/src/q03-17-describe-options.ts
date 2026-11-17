// 07-q03 Partial・Required・Readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/partial
//       https://typescriptbook.jp/reference/type-reuse/utility-types/required
//       https://typescriptbook.jp/reference/type-reuse/utility-types/readonly

export type Options = { size: number; color: string; bold: boolean };

// 問17
export function describeOptions(options: Readonly<Options>): string {
  const base = `${options.size}px ${options.color}`;
  return options.bold ? `${base} 太字` : base;
}
