// 問14 { phone?: string | null } の phone を返す。undefined でも null でも「なし」
//     例: phoneText({ phone: null }) → "なし"
// 引数と戻り値に型注釈を付ける。
// ?? で、値がない場合を扱う。

export function phoneText(contact: { phone?: string | null }): string {
  return contact.phone ?? "なし";
}
