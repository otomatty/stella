// 問19 18歳以上で、免許を持っていれば true を返す
//     例: canDrive(20, true) → true
// 戻り値には型注釈を付けてください。
export function canDrive(age: number, hasLicense: boolean): boolean {
  return age >= 18 && hasLicense;
}
