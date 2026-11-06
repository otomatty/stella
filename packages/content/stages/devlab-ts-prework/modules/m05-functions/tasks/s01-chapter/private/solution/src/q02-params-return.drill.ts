// 問1
export function logTo(lines: string[], message: string): void {
  lines.push(message);
}

// 問2
export function addAll(target: number[], values: readonly number[]): void {
  for (const value of values) {
    target.push(value);
  }
}

// 問3
export function clearAll(items: string[]): void {
  items.length = 0;
}

// 問4
export function rename(user: { name: string }, name: string): void {
  user.name = name;
}

// 問5
export function incrementAll(counts: number[]): void {
  for (let i = 0; i < counts.length; i++) {
    counts[i] = (counts[i] ?? 0) + 1;
  }
}

// 問6
export function resetCounter(counter: { count: number }): void {
  counter.count = 0;
}

// 問7
export function toggleFlag(flags: { [key: string]: boolean }, key: string): void {
  flags[key] = !(flags[key] ?? false);
}

// 問8
export function swapInPlace(items: string[], i: number, j: number): void {
  const a = items[i];
  const b = items[j];
  if (a === undefined || b === undefined) {
    throw new Error("範囲外です");
  }
  items[i] = b;
  items[j] = a;
}

// 問9
export function pushUnique(items: string[], item: string): boolean {
  if (items.includes(item)) {
    return false;
  }
  items.push(item);
  return true;
}

// 問10
export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// 問11
export function parsePort(text: string): number | undefined {
  const n = Number(text);
  if (text.trim() === "" || !Number.isInteger(n) || n < 1 || n > 65535) {
    return undefined;
  }
  return n;
}

// 問12
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

// 問13
export function sumAndAverage(numbers: readonly number[]): { sum: number; average: number } {
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return { sum, average: numbers.length === 0 ? 0 : sum / numbers.length };
}

// 問14
export function doNothing(): void {
  // 何もしない
}

// 問15
export function greetAll(names: readonly string[]): string[] {
  return names.map((name) => `${name}さん、こんにちは`);
}

// 問16
export function describeUser(user: { name: string; age: number }): string {
  return `${user.name}（${user.age}歳）`;
}

// 問17
export function pickNumbers(values: readonly (string | number)[]): number[] {
  const result: number[] = [];
  for (const value of values) {
    if (typeof value === "number") {
      result.push(value);
    }
  }
  return result;
}

// 問18
export function secondsText(ms: number): string {
  return `${(ms / 1000).toFixed(1)}秒`;
}

// 問19
export function firstOr(items: readonly string[], fallback: string): string {
  return items[0] ?? fallback;
}

// 問20
export function sumValues(values: { [key: string]: number }): number {
  let total = 0;
  for (const value of Object.values(values)) {
    total += value;
  }
  return total;
}
