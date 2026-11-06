// 問1
export function hello({ name }: { name: string }): string {
  return `こんにちは、${name}さん`;
}

// 問2
export function areaOf({ width, height }: { width: number; height: number }): number {
  return width * height;
}

// 問3
export function fullName({ first, last }: { first: string; last: string }): string {
  return `${last} ${first}`;
}

// 問4
export function pointText({ x = 0, y = 0 }: { x?: number; y?: number }): string {
  return `(${x}, ${y})`;
}

// 問5
export function optionText({
  size = "M",
  color = "black",
}: {
  size?: string;
  color?: string;
}): string {
  return `${size}/${color}`;
}

// 問6
export function priceText({
  price,
  currency = "円",
}: {
  price: number;
  currency?: string;
}): string {
  return `${price.toLocaleString("ja-JP")}${currency}`;
}

// 問7
export function firstOf([first]: readonly string[]): string | undefined {
  return first;
}

// 問8
export function swapped([a, b]: [number, number]): [number, number] {
  return [b, a];
}

// 問9
export function sumOfPair({ a, b }: { a: number; b: number }): number {
  return a + b;
}

// 問10
export function userLabel({ name, age }: { name: string; age?: number }): string {
  return `${name}（${age ?? "?"}）`;
}

// 問11
export function makeMember({
  name,
  role = "member",
}: {
  name: string;
  role?: "admin" | "member";
}): { name: string; role: "admin" | "member" } {
  return { name, role };
}

// 問12
export function pageRange({ page = 1, perPage = 10 }: { page?: number; perPage?: number }): {
  offset: number;
  limit: number;
} {
  return { offset: (page - 1) * perPage, limit: perPage };
}

// 問13
export function queryText({ q, limit = 10 }: { q: string; limit?: number }): string {
  return `q=${q}&limit=${limit}`;
}

// 問14
export function addressText({
  pref,
  city,
  line = "",
}: {
  pref: string;
  city: string;
  line?: string;
}): string {
  return `${pref}${city}${line}`;
}

// 問15
export function perimeter({ width, height }: { width: number; height: number }): number {
  return (width + height) * 2;
}

// 問16
export function headAndTail([head, ...tail]: readonly number[]): {
  head: number | undefined;
  tail: number[];
} {
  return { head, tail };
}

// 問17
export function ymd({ year, month, day }: { year: number; month: number; day: number }): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// 問18
export function distanceBetween(
  { x: x1, y: y1 }: { x: number; y: number },
  { x: x2, y: y2 }: { x: number; y: number },
): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

// 問19
export function nameWith(
  { first, last }: { first: string; last: string },
  separator = " ",
): string {
  return `${last}${separator}${first}`;
}

// 問20
export function latLngText([lat, lng]: [number, number]): string {
  return `${lat}, ${lng}`;
}
