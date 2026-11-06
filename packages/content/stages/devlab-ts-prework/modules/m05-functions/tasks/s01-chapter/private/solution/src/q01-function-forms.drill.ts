// 問1
export function add3(a: number, b: number, c: number): number {
  return a + b + c;
}

// 問2
export function cubeOf(n: number): number {
  return n ** 3;
}

// 問3
export function initials(first: string, last: string): string {
  return `${first.slice(0, 1)}.${last.slice(0, 1)}.`;
}

// 問4
export function toMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

// 問5
export function isAllUpper(text: string): boolean {
  return text === text.toUpperCase() && text !== text.toLowerCase();
}

// 問6
export function circleArea(radius: number): number {
  return Math.PI * radius * radius;
}

// 問7
export function isWeekendDay(day: number): boolean {
  return day === 0 || day === 6;
}

// 問8
export const half = function (n: number): number {
  return n / 2;
};

// 問9
export const negate = function (n: number): number {
  return -n;
};

// 問10
export const quote = function (text: string): string {
  return `"${text}"`;
};

// 問11
export const kmToMiles = function (km: number): number {
  return Math.round((km / 1.609) * 100) / 100;
};

// 問12
export const percentText = function (ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
};

// 問13
export const isMultipleOf7 = function (n: number): boolean {
  return n % 7 === 0;
};

// 問14
export const lastWord = function (text: string): string {
  return text.slice(text.lastIndexOf(" ") + 1);
};

// 問15
export const triple = (n: number): number => n * 3;

// 問16
export const isPositiveNumber = (n: number): boolean => n > 0;

// 問17
export const firstWord = (text: string): string => text.split(" ")[0] ?? "";

// 問18
export const countSpaces = (text: string): number => text.split(" ").length - 1;

// 問19
export const average2 = (a: number, b: number): number => (a + b) / 2;

// 問20
export const describeTemp = (celsius: number): "夏日" | "普通" => {
  if (celsius >= 25) {
    return "夏日";
  }
  return "普通";
};
