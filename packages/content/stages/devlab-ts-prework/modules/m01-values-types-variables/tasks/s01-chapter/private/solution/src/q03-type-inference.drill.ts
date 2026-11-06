// 問1
export const SITE_NAME = "Agora";

// 問2
export const MAX_MEMBERS = 50;

// 問3
export const IS_BETA = true;

// 問4
export const TAX_RATE = 0.1;

// 問5
export function double(n: number) {
  return n * 2;
}

// 問6
export function toText(n: number) {
  return String(n);
}

// 問7
export function isZero(n: number) {
  return n === 0;
}

// 問8
export function sign(n: number) {
  if (n > 0) {
    return "plus";
  }
  if (n < 0) {
    return "minus";
  }
  return "zero";
}

// 問9
export function judge(score: number) {
  return score >= 60 ? "合格" : "不合格";
}

// 問10
export function square(n: number) {
  return n * n;
}

// 問11
export function joinWords(a: string, b: string) {
  return `${a} ${b}`;
}

// 問12
export function halfIfEven(n: number) {
  if (n % 2 === 0) {
    return n / 2;
  }
  return undefined;
}

// 問13
export function ampm(hour: number) {
  return hour < 12 ? "午前" : "午後";
}

// 問14
export function bigger(a: number, b: number) {
  return a > b ? a : b;
}

// 問15
export function charCount(text: string) {
  return text.length;
}

// 問16
export function isEmptyText(text: string) {
  return text === "";
}

// 問17
export function yesNo(flag: boolean) {
  return flag ? "はい" : "いいえ";
}

// 問18
export function nextYear(year: number) {
  return year + 1;
}

// 問19
export function wrapParen(text: string) {
  return `(${text})`;
}

// 問20
export function firstChar(text: string) {
  return text[0];
}
