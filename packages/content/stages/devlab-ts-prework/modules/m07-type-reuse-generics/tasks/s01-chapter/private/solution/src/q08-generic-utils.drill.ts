// 問1
export function groupItems<T>(
  items: readonly T[],
  keyFn: (item: T) => string,
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    groups[key] = [...(groups[key] ?? []), item];
  }
  return groups;
}

// 問2
export function countItems<T>(
  items: readonly T[],
  keyFn: (item: T) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// 問3
export function splitBy<T>(items: readonly T[], predicate: (item: T) => boolean): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  for (const item of items) {
    if (predicate(item)) {
      yes.push(item);
    } else {
      no.push(item);
    }
  }
  return [yes, no];
}

// 問4
export function uniqueByKey<T>(items: readonly T[], keyFn: (item: T) => string | number): T[] {
  const seen: (string | number)[] = [];
  const result: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.includes(key)) {
      seen.push(key);
      result.push(item);
    }
  }
  return result;
}

// 問5
export function sortByKey<T>(items: readonly T[], keyFn: (item: T) => number): T[] {
  return [...items].sort((a, b) => keyFn(a) - keyFn(b));
}

// 問6
export function chunked<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) {
    throw new Error("size は1以上にしてください");
  }
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

// 問7
export function zipWith<A, B, C>(a: readonly A[], b: readonly B[], fn: (a: A, b: B) => C): C[] {
  const result: C[] = [];
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const x = a[i];
    const y = b[i];
    if (x !== undefined && y !== undefined) {
      result.push(fn(x, y));
    }
  }
  return result;
}

// 問8
export function flattenOnce<T>(nested: readonly (readonly T[])[]): T[] {
  const result: T[] = [];
  for (const inner of nested) {
    result.push(...inner);
  }
  return result;
}

// 問9
export function compact<T>(items: readonly (T | null | undefined)[]): T[] {
  return items.filter((item): item is T => item !== null && item !== undefined);
}

// 問10
export function indexBy<T>(items: readonly T[], keyFn: (item: T) => string): Record<string, T> {
  const result: Record<string, T> = {};
  for (const item of items) {
    result[keyFn(item)] = item;
  }
  return result;
}

// 問11
export function mapValues<T, U>(record: Record<string, T>, fn: (value: T) => U): Record<string, U> {
  const result: Record<string, U> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = fn(value);
  }
  return result;
}

// 問12
export function lastN<T>(items: readonly T[], n: number): T[] {
  return n <= 0 ? [] : items.slice(-n);
}

// 問13
export function difference<T>(a: readonly T[], b: readonly T[]): T[] {
  return a.filter((item) => !b.includes(item));
}

// 問14
export function intersection<T>(a: readonly T[], b: readonly T[]): T[] {
  const result: T[] = [];
  for (const item of a) {
    if (b.includes(item) && !result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}

// 問15
export function union<T>(a: readonly T[], b: readonly T[]): T[] {
  const result: T[] = [];
  for (const item of [...a, ...b]) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}

// 問16
export function takeWhile<T>(items: readonly T[], predicate: (item: T) => boolean): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (!predicate(item)) {
      break;
    }
    result.push(item);
  }
  return result;
}

// 問17
export function dropWhile<T>(items: readonly T[], predicate: (item: T) => boolean): T[] {
  let index = 0;
  while (index < items.length) {
    const item = items[index];
    if (item === undefined || !predicate(item)) {
      break;
    }
    index++;
  }
  return items.slice(index);
}

// 問18
export function findLastItem<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
): T | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item !== undefined && predicate(item)) {
      return item;
    }
  }
  return undefined;
}

// 問19
export function sumOf<T>(items: readonly T[], fn: (item: T) => number): number {
  let total = 0;
  for (const item of items) {
    total += fn(item);
  }
  return total;
}

// 問20
export function minBy<T>(items: readonly T[], fn: (item: T) => number): T | undefined {
  let best: T | undefined;
  let bestValue = Infinity;
  for (const item of items) {
    const value = fn(item);
    if (value < bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}
