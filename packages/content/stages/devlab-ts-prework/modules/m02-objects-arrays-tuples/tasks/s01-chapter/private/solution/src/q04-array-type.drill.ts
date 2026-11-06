// 問1
export function sumAll(numbers: readonly number[]): number {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
}

// 問2
export function countItems(items: readonly string[]): number {
  return items.length;
}

// 問3
export function firstOrZero(numbers: readonly number[]): number {
  return numbers[0] ?? 0;
}

// 問4
export function lastItem(items: readonly string[]): string | undefined {
  return items[items.length - 1];
}

// 問5
export function doubleEach(numbers: readonly number[]): number[] {
  return numbers.map((n) => n * 2);
}

// 問6
export function lengths(words: readonly string[]): number[] {
  return words.map((w) => w.length);
}

// 問7
export function evens(numbers: readonly number[]): number[] {
  return numbers.filter((n) => n % 2 === 0);
}

// 問8
export function longWords(words: readonly string[], min: number): string[] {
  return words.filter((w) => w.length >= min);
}

// 問9
export function containsItem(items: readonly string[], target: string): boolean {
  return items.includes(target);
}

// 問10
export function positionOf(items: readonly string[], target: string): number {
  return items.indexOf(target);
}

// 問11
export function joinWithComma(items: readonly string[]): string {
  return items.join(", ");
}

// 問12
export function maxValue(numbers: readonly number[]): number {
  if (numbers.length === 0) {
    throw new Error("空の配列です");
  }
  return Math.max(...numbers);
}

// 問13
export function minValue(numbers: readonly number[]): number {
  if (numbers.length === 0) {
    throw new Error("空の配列です");
  }
  return Math.min(...numbers);
}

// 問14
export function averageOf(numbers: readonly number[]): number {
  if (numbers.length === 0) {
    return 0;
  }
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total / numbers.length;
}

// 問15
export function upperAll(words: readonly string[]): string[] {
  return words.map((w) => w.toUpperCase());
}

// 問16
export function countPositive(numbers: readonly number[]): number {
  return numbers.filter((n) => n > 0).length;
}

// 問17
export function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i++) {
    result.push(i);
  }
  return result;
}

// 問18
export function repeatItem(item: string, times: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < times; i++) {
    result.push(item);
  }
  return result;
}

// 問19
export function sumEvenIndex(numbers: readonly number[]): number {
  let total = 0;
  numbers.forEach((n, i) => {
    if (i % 2 === 0) {
      total += n;
    }
  });
  return total;
}

// 問20
export function allPositive(numbers: readonly number[]): boolean {
  return numbers.every((n) => n > 0);
}
