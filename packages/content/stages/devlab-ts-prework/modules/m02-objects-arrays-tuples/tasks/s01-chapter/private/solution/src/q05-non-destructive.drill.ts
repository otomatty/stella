// 問1
export function append(items: readonly string[], item: string): string[] {
  return [...items, item];
}

// 問2
export function prepend(items: readonly string[], item: string): string[] {
  return [item, ...items];
}

// 問3
export function dropFirst(items: readonly string[]): string[] {
  return items.slice(1);
}

// 問4
export function dropLast(items: readonly string[]): string[] {
  return items.slice(0, -1);
}

// 問5
export function insertAt(items: readonly string[], index: number, item: string): string[] {
  return [...items.slice(0, index), item, ...items.slice(index)];
}

// 問6
export function removeAt(items: readonly string[], index: number): string[] {
  return items.filter((_, i) => i !== index);
}

// 問7
export function replaceAt(items: readonly string[], index: number, item: string): string[] {
  return items.map((value, i) => (i === index ? item : value));
}

// 問8
export function sortAsc(numbers: readonly number[]): number[] {
  return [...numbers].sort((a, b) => a - b);
}

// 問9
export function sortDesc(numbers: readonly number[]): number[] {
  return [...numbers].sort((a, b) => b - a);
}

// 問10
export function sortWords(words: readonly string[]): string[] {
  return [...words].sort();
}

// 問11
export function reversed(items: readonly string[]): string[] {
  return [...items].reverse();
}

// 問12
export function concatBoth(a: readonly number[], b: readonly number[]): number[] {
  return [...a, ...b];
}

// 問13
export function without(items: readonly string[], value: string): string[] {
  return items.filter((item) => item !== value);
}

// 問14
export function uniqueNumbers(numbers: readonly number[]): number[] {
  return numbers.filter((n, i) => numbers.indexOf(n) === i);
}

// 問15
export function moveToFront(items: readonly string[], index: number): string[] {
  const item = items[index];
  if (item === undefined) {
    return [...items];
  }
  return [item, ...items.filter((_, i) => i !== index)];
}

// 問16
export function swapItems(items: readonly string[], i: number, j: number): string[] {
  const a = items[i];
  const b = items[j];
  if (a === undefined || b === undefined) {
    throw new Error("範囲外です");
  }
  const copied = [...items];
  copied[i] = b;
  copied[j] = a;
  return copied;
}

// 問17
export function take(numbers: readonly number[], n: number): number[] {
  return numbers.slice(0, n);
}

// 問18
export function skip(numbers: readonly number[], n: number): number[] {
  return numbers.slice(n);
}

// 問19
export function filled(length: number, value: number): number[] {
  return Array.from({ length }, () => value);
}

// 問20
export function incrementAt(numbers: readonly number[], index: number): number[] {
  return numbers.map((n, i) => (i === index ? n + 1 : n));
}
