export function sum(numbers: readonly number[]): number {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
}

export function max(numbers: readonly number[]): number {
  if (numbers.length === 0) {
    throw new Error("空の配列には最大値がありません");
  }
  return Math.max(...numbers);
}

export function doubleAll(numbers: readonly number[]): number[] {
  return numbers.map((n) => n * 2);
}

export function positives(numbers: readonly number[]): number[] {
  return numbers.filter((n) => n > 0);
}
