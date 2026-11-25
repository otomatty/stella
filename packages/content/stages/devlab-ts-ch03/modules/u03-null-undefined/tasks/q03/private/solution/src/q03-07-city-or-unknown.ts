// 問7 { address?: { city } } の city を返す。address がなければ「不明」
//     例: cityOrUnknown({}) → "不明"
// 引数と戻り値に型注釈を付ける。
// ?. と ?? で、値がない場合を扱う。

export function cityOrUnknown(user: { address?: { city: string } }): string {
  return user.address?.city ?? "不明";
}
