// 問1
export function mapNumbers(numbers: readonly number[], fn: (n: number) => number): number[] {
  const result: number[] = [];
  for (const n of numbers) {
    result.push(fn(n));
  }
  return result;
}

// 問2
export function filterNumbers(
  numbers: readonly number[],
  predicate: (n: number) => boolean,
): number[] {
  const result: number[] = [];
  for (const n of numbers) {
    if (predicate(n)) {
      result.push(n);
    }
  }
  return result;
}

// 問3
export function eachWithIndex(
  items: readonly string[],
  fn: (item: string, index: number) => void,
): void {
  for (const [index, item] of items.entries()) {
    fn(item, index);
  }
}

// 問4
export function countWhere(items: readonly string[], predicate: (s: string) => boolean): number {
  let count = 0;
  for (const item of items) {
    if (predicate(item)) {
      count++;
    }
  }
  return count;
}

// 問5
export function someMatch(numbers: readonly number[], predicate: (n: number) => boolean): boolean {
  for (const n of numbers) {
    if (predicate(n)) {
      return true;
    }
  }
  return false;
}

// 問6
export function everyMatch(numbers: readonly number[], predicate: (n: number) => boolean): boolean {
  for (const n of numbers) {
    if (!predicate(n)) {
      return false;
    }
  }
  return true;
}

// 問7
export function findNumber(
  numbers: readonly number[],
  predicate: (n: number) => boolean,
): number | undefined {
  for (const n of numbers) {
    if (predicate(n)) {
      return n;
    }
  }
  return undefined;
}

// 問8
export function findIndexWhere(
  items: readonly string[],
  predicate: (s: string) => boolean,
): number {
  for (const [index, item] of items.entries()) {
    if (predicate(item)) {
      return index;
    }
  }
  return -1;
}

// 問9
export function times(n: number, fn: (i: number) => void): void {
  for (let i = 0; i < n; i++) {
    fn(i);
  }
}

// 問10
export function reduceNumbers(
  numbers: readonly number[],
  fn: (acc: number, n: number) => number,
  initial: number,
): number {
  let acc = initial;
  for (const n of numbers) {
    acc = fn(acc, n);
  }
  return acc;
}

// 問11
export function mapStrings(items: readonly string[], fn: (s: string) => string): string[] {
  const result: string[] = [];
  for (const item of items) {
    result.push(fn(item));
  }
  return result;
}

// 問12
export function applyTwice(fn: (n: number) => number, x: number): number {
  return fn(fn(x));
}

// 問13
export function sumBy(words: readonly string[], fn: (w: string) => number): number {
  let total = 0;
  for (const word of words) {
    total += fn(word);
  }
  return total;
}

// 問14
export function maxBy(words: readonly string[], fn: (w: string) => number): string | undefined {
  let best: string | undefined;
  let bestValue = -Infinity;
  for (const word of words) {
    const value = fn(word);
    if (value > bestValue) {
      best = word;
      bestValue = value;
    }
  }
  return best;
}

// 問15
export function sortByKey(words: readonly string[], key: (w: string) => number): string[] {
  return [...words].sort((a, b) => key(a) - key(b));
}

// 問16
export function rejectNumbers(
  numbers: readonly number[],
  predicate: (n: number) => boolean,
): number[] {
  const result: number[] = [];
  for (const n of numbers) {
    if (!predicate(n)) {
      result.push(n);
    }
  }
  return result;
}

// 問17
export function splitBy(
  numbers: readonly number[],
  predicate: (n: number) => boolean,
): [number[], number[]] {
  const yes: number[] = [];
  const no: number[] = [];
  for (const n of numbers) {
    if (predicate(n)) {
      yes.push(n);
    } else {
      no.push(n);
    }
  }
  return [yes, no];
}

// 問18
export function withLog(log: string[], fn: (n: number) => number, x: number): number {
  log.push(`call(${x})`);
  return fn(x);
}

// 問19
export function retry(times: number, fn: (attempt: number) => boolean): boolean {
  for (let attempt = 1; attempt <= times; attempt++) {
    if (fn(attempt)) {
      return true;
    }
  }
  return false;
}

// 問20
export function composeTwo(f: (n: number) => number, g: (n: number) => number, x: number): number {
  return g(f(x));
}
