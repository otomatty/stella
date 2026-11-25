// 問20 店が開いていれば true。平日は9時以上18時未満、休日は10時以上15時未満に開いている
//     例: isOpen(9, false) → true
// 戻り値には型注釈を付けてください。
export function isOpen(hour: number, isHoliday: boolean): boolean {
  if (isHoliday) {
    return hour >= 10 && hour < 15;
  }
  return hour >= 9 && hour < 18;
}
