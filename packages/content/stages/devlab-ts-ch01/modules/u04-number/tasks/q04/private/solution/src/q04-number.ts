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

export function roundTo(value: number, digits: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("value は有限の数にしてください");
  }
  if (!Number.isInteger(digits) || digits < 0 || digits > 10) {
    throw new Error("digits は 0〜10 の整数にしてください");
  }
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function percent(part: number, total: number): number {
  if (total === 0) {
    throw new Error("total に 0 は使えません");
  }
  return roundTo((part / total) * 100, 1);
}
