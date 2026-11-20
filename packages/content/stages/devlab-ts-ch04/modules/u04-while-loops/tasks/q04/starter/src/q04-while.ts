// 04-q04 while文と break・continue
//
// 教材: https://jsprimer.net/basic/loop/
//
// 問題
// 次の3つの関数を書いてください。引数と戻り値には型注釈を付けること。
//
// 1. toBinary(n)
//    0以上の整数を2進数の文字列にする。while 文で2で割った余りを前に足していく
//    （toString(2) は使わない）。負の数か、整数でなければ Error を投げる
//    例: toBinary(10) → "1010"、toBinary(0) → "0"
//
// 2. firstPowerOver(base, limit)
//    base を1回、2回…と掛けていき、limit を初めて超えた値を返す。base が 2 未満なら Error を投げる
//    例: firstPowerOver(2, 100) → 128
//
// 3. sumUntilNegative(numbers)
//    先頭から順に足していき、負の数が出てきたらそこで止める（break）。
//    0 は飛ばす（continue）。足した数と、足した個数を { sum, count } で返す。引数は readonly number[]
//    例: sumUntilNegative([3, 0, 4, -1, 5]) → { sum: 7, count: 2 }

export function toBinary() {}

export function firstPowerOver() {}

export function sumUntilNegative() {}
