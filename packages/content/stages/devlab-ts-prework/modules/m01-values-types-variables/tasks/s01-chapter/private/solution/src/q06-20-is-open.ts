// 01-q06 boolean型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/boolean
//       https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values

// 問20
export function isOpen(hour: number, isHoliday: boolean): boolean {
  if (isHoliday) {
    return hour >= 10 && hour < 15;
  }
  return hour >= 9 && hour < 18;
}
