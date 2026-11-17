// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion

export const STATUSES = ["todo", "doing", "done"] as const;

// 問9
export function isStatus(text: string): boolean {
  return STATUSES.some((status) => status === text);
}
