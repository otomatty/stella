export function applyRule(prices: readonly number[], rule: (price: number) => number): number[] {
  const result: number[] = [];
  for (const price of prices) {
    result.push(rule(price));
  }
  return result;
}

export function countIf(items: readonly string[], predicate: (item: string) => boolean): number {
  let count = 0;
  for (const item of items) {
    if (predicate(item)) {
      count++;
    }
  }
  return count;
}

export function findFirst(
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

export function repeatCall(times: number, fn: (i: number) => void): void {
  for (let i = 0; i < times; i++) {
    fn(i);
  }
}
