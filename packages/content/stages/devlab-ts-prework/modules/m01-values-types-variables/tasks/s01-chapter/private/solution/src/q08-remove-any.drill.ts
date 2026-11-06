// 問1
export function add(a: number, b: number): number {
  return a + b;
}

// 問2
export function greet(name: string): string {
  return `こんにちは、${name}さん`;
}

// 問3
export function lengthOf(text: string): number {
  return text.length;
}

// 問4
export function isAdult(age: number): boolean {
  return age >= 20;
}

// 問5
export function shout(text: string): string {
  return text.toUpperCase();
}

// 問6
export function half(n: number): number {
  return n / 2;
}

// 問7
export function tidy(text: string): string {
  return text.trim();
}

// 問8
export function area(width: number, height: number): number {
  return width * height;
}

// 問9
export function priceText(price: number): string {
  return `${price.toLocaleString("ja-JP")}円`;
}

// 問10
export function isEmpty(text: string): boolean {
  return text.length === 0;
}

// 問11
export function firstChar(text: string): string {
  return text.charAt(0);
}

// 問12
export function sum3(a: number, b: number, c: number): number {
  return a + b + c;
}

// 問13
export function repeat(text: string, times: number): string {
  return text.repeat(times);
}

// 問14
export function larger(a: number, b: number): number {
  return Math.max(a, b);
}

// 問15
export function contains(text: string, word: string): boolean {
  return text.includes(word);
}

// 問16
export function toNumber(text: string): number {
  return Number(text);
}

// 問17
export function countLabel(count: number): string {
  return `${count}件`;
}

// 問18
export function roundOff(n: number): number {
  return Math.round(n);
}

// 問19
export function joinNames(a: string, b: string): string {
  return `${a}・${b}`;
}

// 問20
export function lastChar(text: string): string {
  return text.slice(-1);
}
