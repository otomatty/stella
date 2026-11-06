// 問1
export function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// 問2
export function shortest<T extends { length: number }>(items: readonly T[]): T | undefined {
  let best: T | undefined;
  for (const item of items) {
    if (best === undefined || item.length < best.length) {
      best = item;
    }
  }
  return best;
}

// 問3
export function longer<T extends { length: number }>(a: T, b: T): T {
  return b.length > a.length ? b : a;
}

// 問4
export function pluckAll<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

// 問5
export function mergeObjects<A extends object, B extends object>(a: A, b: B): A & B {
  return { ...a, ...b };
}

// 問6
export function addId<T extends object>(value: T, id: number): T & { id: number } {
  return { ...value, id };
}

// 問7
export function setProp<T, K extends keyof T>(obj: T, key: K, value: T[K]): T {
  return { ...obj, [key]: value };
}

// 問8
export function maxBy<T>(items: readonly T[], fn: (item: T) => number): T | undefined {
  let best: T | undefined;
  let bestValue = -Infinity;
  for (const item of items) {
    const value = fn(item);
    if (value > bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}

// 問9
export function sumBy<T>(items: readonly T[], fn: (item: T) => number): number {
  let total = 0;
  for (const item of items) {
    total += fn(item);
  }
  return total;
}

// 問10
export function sortByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

// 問11
export function oldest<T extends { age: number }>(items: readonly T[]): T | undefined {
  let best: T | undefined;
  for (const item of items) {
    if (best === undefined || item.age > best.age) {
      best = item;
    }
  }
  return best;
}

// 問12
export function sortByNumber<T>(items: readonly T[], fn: (item: T) => number): T[] {
  return [...items].sort((a, b) => fn(a) - fn(b));
}

// 問13
export function findById<T extends { id: number }>(items: readonly T[], id: number): T | undefined {
  return items.find((item) => item.id === id);
}

// 問14
export function updateById<T extends { id: number }>(
  items: readonly T[],
  id: number,
  patch: Partial<T>,
): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

// 問15
export function countWhere<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  let count = 0;
  for (const item of items) {
    if (predicate(item)) {
      count++;
    }
  }
  return count;
}

// 問16
export function orDefault<T extends string | number>(value: T | undefined, fallback: T): T {
  return value ?? fallback;
}

// 問17
export function hasAllKeys<T extends object>(obj: T, keys: readonly (keyof T)[]): boolean {
  return keys.every((key) => obj[key] !== undefined);
}

// 問18
export function firstWhere<T>(items: readonly T[], predicate: (item: T) => boolean): T | undefined {
  for (const item of items) {
    if (predicate(item)) {
      return item;
    }
  }
  return undefined;
}

// 問19
export function countByKey<T, K extends string>(
  items: readonly T[],
  keyFn: (item: T) => K,
): Partial<Record<K, number>> {
  const counts: Partial<Record<K, number>> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// 問20
export function toIdMap<T extends { id: number }>(items: readonly T[]): Record<number, T> {
  const result: Record<number, T> = {};
  for (const item of items) {
    result[item.id] = item;
  }
  return result;
}
