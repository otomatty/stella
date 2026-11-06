// 問1
export function identity<T>(value: T): T {
  return value;
}

// 問2
export function firstOf<T>(items: readonly T[]): T | undefined {
  return items[0];
}

// 問3
export function lastOf<T>(items: readonly T[]): T | undefined {
  return items[items.length - 1];
}

// 問4
export function wrapInArray<T>(value: T): T[] {
  return [value];
}

// 問5
export function repeatValue<T>(value: T, times: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < times; i++) {
    result.push(value);
  }
  return result;
}

// 問6
export function makePair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}

// 問7
export function swapPair<A, B>(pair: readonly [A, B]): [B, A] {
  return [pair[1], pair[0]];
}

// 問8
export type Box<T> = { value: T };

export function boxOf<T>(value: T): Box<T> {
  return { value };
}

// 問9
export function unboxed<T>(box: { value: T }): T {
  return box.value;
}

// 問10
export function reversedCopy<T>(items: readonly T[]): T[] {
  return [...items].reverse();
}

// 問11
export function nth<T>(items: readonly T[], index: number): T | undefined {
  return index < 0 ? items[items.length + index] : items[index];
}

// 問12
export function takeFirst<T>(items: readonly T[], n: number): T[] {
  return items.slice(0, n);
}

// 問13
export function countOf<T>(items: readonly T[], target: T): number {
  let count = 0;
  for (const item of items) {
    if (item === target) {
      count++;
    }
  }
  return count;
}

// 問14
export function includesValue<T>(items: readonly T[], value: T): boolean {
  return items.includes(value);
}

// 問15
export function withoutValue<T>(items: readonly T[], value: T): T[] {
  return items.filter((item) => item !== value);
}

// 問16
export function lastIndexOfValue<T>(items: readonly T[], value: T): number {
  return items.lastIndexOf(value);
}

// 問17
export function filledWith<T>(length: number, value: T): T[] {
  return Array.from({ length }, () => value);
}

// 問18
export type Maybe<T> = T | null;

export function orElse<T>(value: Maybe<T>, fallback: T): T {
  return value ?? fallback;
}

// 問19
export function zip<A, B>(a: readonly A[], b: readonly B[]): [A, B][] {
  const result: [A, B][] = [];
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const x = a[i];
    const y = b[i];
    if (x !== undefined && y !== undefined) {
      result.push([x, y]);
    }
  }
  return result;
}

// 問20
export function toggleItem<T>(items: readonly T[], item: T): T[] {
  return items.includes(item) ? items.filter((x) => x !== item) : [...items, item];
}
