// 01-q04 number型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/number

// 問9
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
