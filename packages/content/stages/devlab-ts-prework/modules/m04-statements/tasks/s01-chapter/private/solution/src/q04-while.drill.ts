// 問1
export function countDigits(n: number): number {
  let rest = n;
  let count = 0;
  while (rest > 0) {
    rest = Math.floor(rest / 10);
    count++;
  }
  return count;
}

// 問2
export function halveUntilOdd(n: number): number {
  if (n === 0) {
    return 0;
  }
  let value = n;
  while (value % 2 === 0) {
    value /= 2;
  }
  return value;
}

// 問3
export function powerOfTwoAtLeast(n: number): number {
  let value = 1;
  while (value < n) {
    value *= 2;
  }
  return value;
}

// 問4
export function stepsToZero(n: number): number {
  let value = n;
  let steps = 0;
  while (value > 0) {
    value = value % 2 === 0 ? value / 2 : value - 1;
    steps++;
  }
  return steps;
}

// 問5
export function maxCountWithin(limit: number): number {
  let k = 0;
  let total = 0;
  while (total + (k + 1) <= limit) {
    k++;
    total += k;
  }
  return k;
}

// 問6
export function reverseNumber(n: number): number {
  let rest = n;
  let result = 0;
  while (rest > 0) {
    result = result * 10 + (rest % 10);
    rest = Math.floor(rest / 10);
  }
  return result;
}

// 問7
export function isPrime(n: number): boolean {
  if (n < 2) {
    return false;
  }
  let i = 2;
  while (i * i <= n) {
    if (n % i === 0) {
      return false;
    }
    i++;
  }
  return true;
}

// 問8
export function nextPrime(n: number): number {
  const isPrimeNumber = (k: number): boolean => {
    if (k < 2) {
      return false;
    }
    for (let i = 2; i * i <= k; i++) {
      if (k % i === 0) {
        return false;
      }
    }
    return true;
  };
  let candidate = n + 1;
  while (!isPrimeNumber(candidate)) {
    candidate++;
  }
  return candidate;
}

// 問9
export function lcm(a: number, b: number): number {
  let value = a;
  while (value % b !== 0) {
    value += a;
  }
  return value;
}

// 問10
export function sumSkipThrees(n: number): number {
  let total = 0;
  let i = 0;
  while (i < n) {
    i++;
    if (i % 3 === 0) {
      continue;
    }
    total += i;
  }
  return total;
}

// 問11
export function firstIndexOver(numbers: readonly number[], limit: number): number {
  let found = -1;
  let i = 0;
  while (i < numbers.length) {
    if ((numbers[i] ?? -Infinity) > limit) {
      found = i;
      break;
    }
    i++;
  }
  return found;
}

// 問12
export function leadingZeros(text: string): number {
  let count = 0;
  while (text[count] === "0") {
    count++;
  }
  return count;
}

// 問13
export function trimZeros(text: string): string {
  let start = 0;
  while (start < text.length - 1 && text[start] === "0") {
    start++;
  }
  return text.slice(start);
}

// 問14
export function digitalRoot(n: number): number {
  let value = n;
  while (value >= 10) {
    let sum = 0;
    let rest = value;
    while (rest > 0) {
      sum += rest % 10;
      rest = Math.floor(rest / 10);
    }
    value = sum;
  }
  return value;
}

// 問15
export function bitLength(n: number): number {
  let rest = n;
  let count = 0;
  do {
    rest = Math.floor(rest / 2);
    count++;
  } while (rest > 0);
  return count;
}

// 問16
export function repeatToLength(text: string, length: number): string {
  if (text === "") {
    return "";
  }
  let result = "";
  while (result.length < length) {
    result += text;
  }
  return result.slice(0, length);
}

// 問17
export function divisibleTimes(n: number, d: number): number {
  let value = n;
  let count = 0;
  while (value !== 0 && value % d === 0) {
    value /= d;
    count++;
  }
  return count;
}

// 問18
export function sumPositives(numbers: readonly number[]): number {
  let total = 0;
  for (const n of numbers) {
    if (n <= 0) {
      continue;
    }
    total += n;
  }
  return total;
}

// 問19
export function firstRepeatedChar(text: string): string | undefined {
  let seen = "";
  let found: string | undefined;
  for (const c of text) {
    if (seen.includes(c)) {
      found = c;
      break;
    }
    seen += c;
  }
  return found;
}

// 問20
export function digitsOf(n: number): number[] {
  const digits: number[] = [];
  let rest = n;
  do {
    digits.unshift(rest % 10);
    rest = Math.floor(rest / 10);
  } while (rest > 0);
  return digits;
}
