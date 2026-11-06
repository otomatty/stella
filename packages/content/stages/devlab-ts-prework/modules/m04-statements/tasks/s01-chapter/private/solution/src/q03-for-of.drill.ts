// 問1
export function sumArray(numbers: readonly number[]): number {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
}

// 問2
export function countMatches(items: readonly string[], target: string): number {
  let count = 0;
  for (const item of items) {
    if (item === target) {
      count++;
    }
  }
  return count;
}

// 問3
export function longestWord(words: readonly string[]): string {
  let longest = "";
  for (const word of words) {
    if (word.length > longest.length) {
      longest = word;
    }
  }
  return longest;
}

// 問4
export function indexOfMax(numbers: readonly number[]): number {
  let best = -1;
  for (let i = 0; i < numbers.length; i++) {
    const n = numbers[i];
    const current = numbers[best];
    if (n !== undefined && (current === undefined || n > current)) {
      best = i;
    }
  }
  return best;
}

// 問5
export function productOf(numbers: readonly number[]): number {
  let result = 1;
  for (const n of numbers) {
    result *= n;
  }
  return result;
}

// 問6
export function reverseArray(items: readonly string[]): string[] {
  const result: string[] = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item !== undefined) {
      result.push(item);
    }
  }
  return result;
}

// 問7
export function squaresUpTo(n: number): number[] {
  const result: number[] = [];
  for (let i = 1; i <= n; i++) {
    result.push(i * i);
  }
  return result;
}

// 問8
export function evensUpTo(n: number): number[] {
  const result: number[] = [];
  for (let i = 0; i <= n; i += 2) {
    result.push(i);
  }
  return result;
}

// 問9
export function joinWithDash(items: readonly string[]): string {
  let result = "";
  for (const [i, item] of items.entries()) {
    result += i === 0 ? item : `-${item}`;
  }
  return result;
}

// 問10
export function countUpper(text: string): number {
  let count = 0;
  for (const c of text) {
    if (c >= "A" && c <= "Z") {
      count++;
    }
  }
  return count;
}

// 問11
export function positionsOf(text: string, char: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === char) {
      result.push(i);
    }
  }
  return result;
}

// 問12
export function digitTotal(text: string): number {
  let total = 0;
  for (const c of text) {
    if (c >= "0" && c <= "9") {
      total += Number(c);
    }
  }
  return total;
}

// 問13
export function firstNegative(numbers: readonly number[]): number | undefined {
  for (const n of numbers) {
    if (n < 0) {
      return n;
    }
  }
  return undefined;
}

// 問14
export function allEven(numbers: readonly number[]): boolean {
  for (const n of numbers) {
    if (n % 2 !== 0) {
      return false;
    }
  }
  return true;
}

// 問15
export function runningTotal(numbers: readonly number[]): number[] {
  const result: number[] = [];
  let total = 0;
  for (const n of numbers) {
    total += n;
    result.push(total);
  }
  return result;
}

// 問16
export function zipSum(a: readonly number[], b: readonly number[]): number[] {
  const result: number[] = [];
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    result.push((a[i] ?? 0) + (b[i] ?? 0));
  }
  return result;
}

// 問17
export function flatten(nested: readonly (readonly number[])[]): number[] {
  const result: number[] = [];
  for (const inner of nested) {
    for (const n of inner) {
      result.push(n);
    }
  }
  return result;
}

// 問18
export function countInRange(numbers: readonly number[], min: number, max: number): number {
  let count = 0;
  for (const n of numbers) {
    if (n >= min && n <= max) {
      count++;
    }
  }
  return count;
}

// 問19
export function dedupe(items: readonly string[]): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}

// 問20
export function stairs(n: number): string[] {
  const result: string[] = [];
  for (let i = 1; i <= n; i++) {
    result.push("*".repeat(i));
  }
  return result;
}
