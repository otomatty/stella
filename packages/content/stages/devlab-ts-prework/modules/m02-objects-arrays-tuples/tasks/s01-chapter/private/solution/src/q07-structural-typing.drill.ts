export type Cat = { name: string; age: number; meow: string };
export type Dog = { name: string; age: number; breed: string };
export type Robot = { name: string; version: number };
export type Box = { width: number; height: number; depth: number };
export type Paper = { width: number; height: number };
export type Product = { name: string; price: number; stock: number };
export type Service = { name: string; price: number; hours: number };

// 問1
export function nameOf(x: { name: string }): string {
  return x.name;
}

// 問2
export function nameLength(x: { name: string }): number {
  return x.name.length;
}

// 問3
export function ageNextYear(x: { age: number }): number {
  return x.age + 1;
}

// 問4
export function isOlderThan(x: { age: number }, years: number): boolean {
  return x.age > years;
}

// 問5
export function faceArea(x: { width: number; height: number }): number {
  return x.width * x.height;
}

// 問6
export function isSquareShape(x: { width: number; height: number }): boolean {
  return x.width === x.height;
}

// 問7
export function priceWithTax(x: { price: number }): number {
  return Math.floor((x.price * 110) / 100);
}

// 問8
export function isFree(x: { price: number }): boolean {
  return x.price === 0;
}

// 問9
export function priceLabel(x: { name: string; price: number }): string {
  return `${x.name}: ${x.price}円`;
}

// 問10
export function introduce(x: { name: string; age: number }): string {
  return `${x.name}（${x.age}歳）`;
}

// 問11
export function olderName(
  a: { name: string; age: number },
  b: { name: string; age: number },
): string {
  return b.age > a.age ? b.name : a.name;
}

// 問12
export function totalPrice(items: readonly { price: number }[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}

// 問13
export function namesOf(items: readonly { name: string }[]): string[] {
  return items.map((item) => item.name);
}

// 問14
export function perimeterOf(x: { width: number; height: number }): number {
  return (x.width + x.height) * 2;
}

// 問15
export function orientation(x: { width: number; height: number }): "横長" | "縦長" | "正方形" {
  if (x.width > x.height) {
    return "横長";
  }
  if (x.width < x.height) {
    return "縦長";
  }
  return "正方形";
}

// 問16
export function hasLongName(x: { name: string }, max: number): boolean {
  return x.name.length > max;
}

// 問17
export function averageAge(items: readonly { age: number }[]): number {
  if (items.length === 0) {
    return 0;
  }
  let total = 0;
  for (const item of items) {
    total += item.age;
  }
  return total / items.length;
}

// 問18
export function cheapestName(items: readonly { name: string; price: number }[]): string {
  const [first, ...rest] = items;
  if (first === undefined) {
    throw new Error("空の配列です");
  }
  let cheapest = first;
  for (const item of rest) {
    if (item.price < cheapest.price) {
      cheapest = item;
    }
  }
  return cheapest.name;
}

// 問19
export function sumArea(items: readonly { width: number; height: number }[]): number {
  let total = 0;
  for (const item of items) {
    total += item.width * item.height;
  }
  return total;
}

// 問20
export function sizeText(x: { width: number; height: number }): string {
  return `${x.width} × ${x.height}`;
}
