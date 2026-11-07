// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion

export const PRIORITY_POINTS = { high: 3, middle: 2, low: 1 } as const;

export type Priority = keyof typeof PRIORITY_POINTS;

// 問12
export function priorityPoint(priority: Priority): number {
  return PRIORITY_POINTS[priority];
}
