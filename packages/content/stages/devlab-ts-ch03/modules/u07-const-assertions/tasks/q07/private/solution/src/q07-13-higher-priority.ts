// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion

export const PRIORITY_POINTS = { high: 3, middle: 2, low: 1 } as const;

export type Priority = keyof typeof PRIORITY_POINTS;

// 問13
export function higherPriority(a: Priority, b: Priority): Priority {
  return PRIORITY_POINTS[b] > PRIORITY_POINTS[a] ? b : a;
}
