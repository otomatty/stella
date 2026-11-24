// 問15 誕生日 birthday の人の、today の時点の満年齢を返す（誕生日の当日に1つ増える）
//     例: ageOn(2000年4月2日, 2026年4月1日) → 25
// 引数と戻り値に型注釈を付けます。
// Date では月を 0〜11（1月が 0）で数えます。
// ローカル時刻の年月日は getFullYear()、getMonth()、getDate() で取り出します。
// 引数の Date は変更しません。

export function ageOn(birthday: Date, today: Date): number {
  const age = today.getFullYear() - birthday.getFullYear();
  const hadBirthday =
    today.getMonth() > birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() && today.getDate() >= birthday.getDate());
  return hadBirthday ? age : age - 1;
}
