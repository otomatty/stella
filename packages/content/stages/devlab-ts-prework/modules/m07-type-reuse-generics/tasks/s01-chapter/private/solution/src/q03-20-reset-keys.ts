// 07-q03 Partial・Required・Readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/partial
//       https://typescriptbook.jp/reference/type-reuse/utility-types/required
//       https://typescriptbook.jp/reference/type-reuse/utility-types/readonly

export type Options = { size: number; color: string; bold: boolean };

export const DEFAULT_OPTIONS: Options = { size: 12, color: "black", bold: false };

// 問20
export function resetKeys(options: Options, keys: readonly (keyof Options)[]): Options {
  const result = { ...options };
  for (const key of keys) {
    if (key === "size") {
      result.size = DEFAULT_OPTIONS.size;
    } else if (key === "color") {
      result.color = DEFAULT_OPTIONS.color;
    } else {
      result.bold = DEFAULT_OPTIONS.bold;
    }
  }
  return result;
}
