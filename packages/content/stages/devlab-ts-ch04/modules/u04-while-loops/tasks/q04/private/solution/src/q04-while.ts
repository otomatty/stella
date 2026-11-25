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
// firstPowerOver では、何回掛けるかが決まっていないので while 文を使います。
export function toBinary(n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("0以上の整数にしてください");
  }
  if (n === 0) {
    return "0";
  }
  let rest = n;
  let result = "";
  while (rest > 0) {
    result = `${rest % 2}${result}`;
    rest = Math.floor(rest / 2);
  }
  return result;
}

export function firstPowerOver(base: number, limit: number): number {
  if (base < 2) {
    throw new Error("base は2以上にしてください");
  }
  let value = base;
  while (value <= limit) {
    value *= base;
  }
  return value;
}

export function sumUntilNegative(numbers: readonly number[]): { sum: number; count: number } {
  let sum = 0;
  let count = 0;
  for (const n of numbers) {
    if (n < 0) {
      break;
    }
    if (n === 0) {
      continue;
    }
    sum += n;
    count++;
  }
  return { sum, count };
}
