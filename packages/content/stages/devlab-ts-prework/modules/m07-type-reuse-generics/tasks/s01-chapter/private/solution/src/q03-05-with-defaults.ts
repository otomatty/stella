// 07-q03 Partial・Required・Readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/partial
//       https://typescriptbook.jp/reference/type-reuse/utility-types/required
//       https://typescriptbook.jp/reference/type-reuse/utility-types/readonly

export type Options = { size: number; color: string; bold: boolean };

export const DEFAULT_OPTIONS: Options = { size: 12, color: "black", bold: false };

// 問5
export function withDefaults(options: Partial<Options>): Options {
  return { ...DEFAULT_OPTIONS, ...options };
}
