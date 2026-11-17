// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export const COLORS = ["red", "green", "blue"] as const;

// 問17
export function isColor(text: string): text is (typeof COLORS)[number] {
  return COLORS.some((color) => color === text);
}
