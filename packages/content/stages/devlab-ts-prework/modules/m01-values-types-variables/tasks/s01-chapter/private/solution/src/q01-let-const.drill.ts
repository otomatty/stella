// 問1
export function addTax(price: number): number {
  const tax = Math.floor(price * 0.1);
  return price + tax;
}

// 問2
export function splitBill(total: number, people: number): number {
  const perPerson = total / people;
  return Math.ceil(perPerson / 100) * 100;
}

// 問3
export function minutesToText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}時間${rest}分`;
}

// 問4
export function average3(a: number, b: number, c: number): number {
  const total = a + b + c;
  return total / 3;
}

// 問5
export function sumTo(n: number): number {
  let total = 0;
  for (let i = 1; i <= n; i++) {
    total += i;
  }
  return total;
}

// 問6
export function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// 問7
export function countDown(n: number): string {
  let text = "";
  for (let i = n; i >= 1; i--) {
    text += `${i}, `;
  }
  return `${text}発射`;
}

// 問8
export function power(base: number, exponent: number): number {
  let result = 1;
  for (let i = 0; i < exponent; i++) {
    result *= base;
  }
  return result;
}

// 問9
export function countChar(text: string, char: string): number {
  let count = 0;
  for (const c of text) {
    if (c === char) {
      count++;
    }
  }
  return count;
}

// 問10
export function reverseText(text: string): string {
  let result = "";
  for (const c of text) {
    result = c + result;
  }
  return result;
}

// 問11
export function digitSum(n: number): number {
  let rest = n;
  let total = 0;
  while (rest > 0) {
    total += rest % 10;
    rest = Math.floor(rest / 10);
  }
  return total;
}

// 問12
export function fizzBuzz(n: number): string {
  let label = "";
  if (n % 3 === 0) {
    label += "Fizz";
  }
  if (n % 5 === 0) {
    label += "Buzz";
  }
  return label === "" ? String(n) : label;
}

// 問13
export function compound(principal: number, rate: number, years: number): number {
  let amount = principal;
  for (let i = 0; i < years; i++) {
    amount *= 1 + rate / 100;
  }
  return Math.round(amount);
}

// 問14
export function maxOf3(a: number, b: number, c: number): number {
  let max = a;
  if (b > max) {
    max = b;
  }
  if (c > max) {
    max = c;
  }
  return max;
}

// 問15
export function shippingFee(subtotal: number, isMember: boolean): number {
  let fee = 500;
  if (subtotal >= 3000 || isMember) {
    fee = 0;
  }
  return fee;
}

// 問16
export function countVowels(text: string): number {
  const vowels = "aeiou";
  let count = 0;
  for (const c of text) {
    if (vowels.includes(c)) {
      count++;
    }
  }
  return count;
}

// 問17
export function collatzSteps(n: number): number {
  let current = n;
  let steps = 0;
  while (current !== 1) {
    current = current % 2 === 0 ? current / 2 : current * 3 + 1;
    steps++;
  }
  return steps;
}

// 問18
export function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    const rest = x % y;
    x = y;
    y = rest;
  }
  return x;
}

// 問19
export function fibonacci(n: number): number {
  let prev = 0;
  let current = 1;
  for (let i = 0; i < n; i++) {
    const next = prev + current;
    prev = current;
    current = next;
  }
  return prev;
}

// 問20
export function secondsToClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
