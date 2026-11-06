// 01-q04 number型
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/number
//
// 問題
// 次の2つの関数を書いてください。引数と戻り値には型注釈を付けること。
//
// 1. roundTo(value, digits)
//    value を小数第 digits 位までに四捨五入して返す
//    例: roundTo(3.14159, 2)    → 3.14
//        roundTo(1234.5678, 1)  → 1234.6
//        roundTo(2.5, 0)        → 3
//    次のときは Error を投げる（throw new Error("…")）
//    - value が NaN や Infinity のとき
//    - digits が 0〜10 の整数でないとき
//    ヒント: Math.round、Number.isFinite、Number.isInteger
//
// 2. percent(part, total)
//    part が total の何パーセントかを、小数第1位までに四捨五入して返す。roundTo を使うこと
//    例: percent(1, 3) → 33.3
//        percent(5, 5) → 100
//    total が 0 のときは Error を投げる

export function roundTo() {}

export function percent() {}
