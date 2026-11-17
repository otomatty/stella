// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date

// 問15
export function ageOn(birthday: Date, today: Date): number {
  const age = today.getFullYear() - birthday.getFullYear();
  const hadBirthday =
    today.getMonth() > birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() && today.getDate() >= birthday.getDate());
  return hadBirthday ? age : age - 1;
}
