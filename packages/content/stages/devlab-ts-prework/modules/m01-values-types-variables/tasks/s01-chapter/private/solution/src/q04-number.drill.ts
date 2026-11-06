// 問1
export function roundOff(n: number): number {
  return Math.round(n);
}

// 問2
export function floorTo10(n: number): number {
  return Math.floor(n / 10) * 10;
}

// 問3
export function ceilTo100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

// 問4
export function absDiff(a: number, b: number): number {
  return Math.abs(a - b);
}

// 問5
export function remainder(a: number, b: number): number {
  return a % b;
}

// 問6
export function isMultipleOf(n: number, base: number): boolean {
  return n % base === 0;
}

// 問7
export function cube(n: number): number {
  return n ** 3;
}

// 問8
export function squareRoot(n: number): number {
  if (n < 0) {
    throw new Error("負の数の平方根は求められません");
  }
  return Math.sqrt(n);
}

// 問9
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// 問10
export function toFixed1(n: number): string {
  return n.toFixed(1);
}

// 問11
export function parseIntOrZero(text: string): number {
  const n = Number.parseInt(text, 10);
  return Number.isNaN(n) ? 0 : n;
}

// 問12
export function isFiniteNumber(n: number): boolean {
  return Number.isFinite(n);
}

// 問13
export function percentOf(part: number, total: number): number {
  return Math.round((part / total) * 100);
}

// 問14
export function average2(a: number, b: number): number {
  return (a + b) / 2;
}

// 問15
export function minutesToSeconds(minutes: number): number {
  return minutes * 60;
}

// 問16
export function kmToMeters(km: number): number {
  return km * 1000;
}

// 問17
export function hypotenuse(a: number, b: number): number {
  return Math.hypot(a, b);
}

// 問18
export function digitCount(n: number): number {
  return String(n).length;
}

// 問19
export function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

// 問20
export function fahrenheitToCelsius(fahrenheit: number): number {
  const celsius = ((fahrenheit - 32) * 5) / 9;
  return Math.round(celsius * 10) / 10;
}
