// 問6 { address?: { city } } の city を返す。address がなければ undefined
//     例: cityOf({ address: { city: "渋谷区" } }) → "渋谷区"
// 引数と戻り値に型注釈を付ける。
// ?. で、address がない場合を扱う。

export function cityOf(user: { address?: { city: string } }): string | undefined {
  return user.address?.city;
}
