// 01-q06 boolean型
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/boolean
//       https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values
//
// 問題
// 次の3つの関数を書いてください。引数と戻り値には型注釈を付けること。
//
// 1. isLeapYear(year)
//    うるう年なら true を返す
//    - 4で割り切れる年はうるう年
//    - ただし、100で割り切れる年はうるう年ではない
//    - ただし、400で割り切れる年はうるう年
//    例: isLeapYear(2024) → true、isLeapYear(1900) → false、isLeapYear(2000) → true
//
// 2. hasText(text)
//    空白以外の文字が1文字でもあれば true、なければ false を返す
//    例: hasText("  a ") → true、hasText("   ") → false
//    条件: 戻り値は true か false にする。text.trim().length のような数値を返さない
//
// 3. canEnter(age, hasTicket, isStaff)
//    イベント会場に入れるなら true を返す
//    - スタッフは、いつでも入れる
//    - スタッフでない人は、チケットを持っていて、かつ12歳以上なら入れる

export function isLeapYear() {}

export function hasText() {}

export function canEnter() {}
