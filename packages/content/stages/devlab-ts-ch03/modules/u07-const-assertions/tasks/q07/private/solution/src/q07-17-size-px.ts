// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion

// 問17
export const SIZE_PX = { S: 12, M: 16, L: 20 } as const;

export function sizePx(size: "S" | "M" | "L"): number {
  return SIZE_PX[size];
}
