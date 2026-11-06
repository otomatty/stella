export function toBinary(n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("0以上の整数にしてください");
  }
  if (n === 0) {
    return "0";
  }
  let rest = n;
  let result = "";
  while (rest > 0) {
    result = `${rest % 2}${result}`;
    rest = Math.floor(rest / 2);
  }
  return result;
}

export function firstPowerOver(base: number, limit: number): number {
  if (base < 2) {
    throw new Error("base は2以上にしてください");
  }
  let value = base;
  while (value <= limit) {
    value *= base;
  }
  return value;
}

export function sumUntilNegative(numbers: readonly number[]): { sum: number; count: number } {
  let sum = 0;
  let count = 0;
  for (const n of numbers) {
    if (n < 0) {
      break;
    }
    if (n === 0) {
      continue;
    }
    sum += n;
    count++;
  }
  return { sum, count };
}
