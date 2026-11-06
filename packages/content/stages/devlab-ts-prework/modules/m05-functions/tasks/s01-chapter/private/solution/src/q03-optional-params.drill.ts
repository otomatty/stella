// 問1
export function greetWithTitle(name: string, title?: string): string {
  return `${name}${title ?? "さん"}`;
}

// 問2
export function fixed(n: number, digits?: number): string {
  return n.toFixed(digits ?? 0);
}

// 問3
export function nameText(last: string, first?: string): string {
  return first === undefined ? last : `${last} ${first}`;
}

// 問4
export function repeatOnce(text: string, times?: number): string {
  return text.repeat(times ?? 1);
}

// 問5
export function countdownFrom(from: number, to?: number): number[] {
  const end = to ?? 1;
  const result: number[] = [];
  for (let i = from; i >= end; i--) {
    result.push(i);
  }
  return result;
}

// 問6
export function cut(text: string, max?: number): string {
  const limit = max ?? 10;
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

// 問7
export function padTwo(n: number, width?: number): string {
  return String(n).padStart(width ?? 2, "0");
}

// 問8
export function priceLabel(price: number, unit?: string): string {
  return `${price.toLocaleString("ja-JP")}${unit ?? "円"}`;
}

// 問9
export function firstWords(text: string, count?: number): string {
  return text
    .split(" ")
    .slice(0, count ?? 1)
    .join(" ");
}

// 問10
export function makeUser(name: string, age?: number): { name: string; age?: number } {
  return age === undefined ? { name } : { name, age };
}

// 問11
export function averageOf2(a: number, b?: number): number {
  return b === undefined ? a : (a + b) / 2;
}

// 問12
export function tagText(name: string, color?: string): string {
  return color === undefined ? `<${name}>` : `<${name}:${color}>`;
}

// 問13
export function isLongEnough(text: string, min?: number): boolean {
  return text.length >= (min ?? 8);
}

// 問14
export function logText(message: string, level?: "info" | "warn"): string {
  return `[${(level ?? "info").toUpperCase()}] ${message}`;
}

// 問15
export function roundStep(n: number, step?: number): number {
  const s = step ?? 1;
  return Math.round(n / s) * s;
}

// 問16
export function ageLabel(age?: number): string {
  return age === undefined ? "年齢不明" : `${age}歳`;
}

// 問17
export function sumUpTo3(a: number, b?: number, c?: number): number {
  return a + (b ?? 0) + (c ?? 0);
}

// 問18
export function buildUrl(path: string, query?: string): string {
  return query === undefined ? path : `${path}?${query}`;
}

// 問19
export function inRange(n: number, min?: number, max?: number): boolean {
  return n >= (min ?? 0) && n <= (max ?? 100);
}

// 問20
export function initialsOf(first: string, last?: string): string {
  const head = first.slice(0, 1);
  return last === undefined ? head : `${head}.${last.slice(0, 1)}`;
}
