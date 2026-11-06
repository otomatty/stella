// 問1
export function total(...numbers: number[]): number {
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return sum;
}

// 問2
export function largest(first: number, ...rest: number[]): number {
  return Math.max(first, ...rest);
}

// 問3
export function smallest(first: number, ...rest: number[]): number {
  return Math.min(first, ...rest);
}

// 問4
export function concatAll(...texts: string[]): string {
  return texts.join("");
}

// 問5
export function countArgs(...args: unknown[]): number {
  return args.length;
}

// 問6
export function joinWords(separator: string, ...words: string[]): string {
  return words.join(separator);
}

// 問7
export function averageAll(...numbers: number[]): number {
  if (numbers.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return sum / numbers.length;
}

// 問8
export function allTrue(...flags: boolean[]): boolean {
  return flags.every((flag) => flag);
}

// 問9
export function anyTrue(...flags: boolean[]): boolean {
  return flags.some((flag) => flag);
}

// 問10
export function pathOf(...parts: string[]): string {
  return parts.filter((part) => part !== "").join("/");
}

// 問11
export function multiplyAll(...numbers: number[]): number {
  let result = 1;
  for (const n of numbers) {
    result *= n;
  }
  return result;
}

// 問12
export function firstDefined(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

// 問13
export function labeled(label: string, ...items: string[]): string {
  return items.length === 0 ? `[${label}]` : `[${label}] ${items.join(", ")}`;
}

// 問14
export function longestOf(...words: string[]): string {
  let longest = "";
  for (const word of words) {
    if (word.length > longest.length) {
      longest = word;
    }
  }
  return longest;
}

// 問15
export function countOf(target: string, ...items: string[]): number {
  return items.filter((item) => item === target).length;
}

// 問16
export function pushAll(target: number[], ...values: number[]): number {
  return target.push(...values);
}

// 問17
export function maxOfArray(numbers: readonly number[]): number {
  if (numbers.length === 0) {
    throw new Error("空の配列です");
  }
  return Math.max(...numbers);
}

// 問18
export function mergeArrays(...arrays: (readonly number[])[]): number[] {
  const result: number[] = [];
  for (const array of arrays) {
    result.push(...array);
  }
  return result;
}

// 問19
export function withPrefix(prefix: string, ...items: string[]): string[] {
  return items.map((item) => `${prefix}${item}`);
}

// 問20
export function uniqueOf(...items: string[]): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}
