// 問1
export function subtract(a: number, b: number): number {
  return a - b;
}

// 問2
export function honorific(name: string): string {
  return `${name}さん`;
}

// 問3
export function isAdult(age: number): boolean {
  return age >= 18;
}

// 問4
export function repeatText(text: string, times: number): string {
  return text.repeat(times);
}

// 問5
export function rectangleArea(width: number, height: number): number {
  return width * height;
}

// 問6
export function fullName(lastName: string, firstName: string): string {
  return `${lastName} ${firstName}`;
}

// 問7
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

// 問8
export function isEven(n: number): boolean {
  return n % 2 === 0;
}

// 問9
export function greet(name: string, hour: number): string {
  if (hour < 12) {
    return `おはよう、${name}さん`;
  }
  return `こんにちは、${name}さん`;
}

// 問10
export function initial(name: string): string {
  return name.slice(0, 1);
}

// 問11
export function discountPrice(price: number, percentOff: number): number {
  return Math.floor((price * (100 - percentOff)) / 100);
}

// 問12
export function formatYen(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}円`;
}

// 問13
export function isLongerThan(text: string, length: number): boolean {
  return text.length > length;
}

// 問14
export function half(n: number): number {
  return n / 2;
}

// 問15
export function labelWithCount(label: string, count: number): string {
  return `${label}（${count}件）`;
}

// 問16
export function isBetween(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// 問17
export function secondsToMinutes(seconds: number): number {
  return Math.floor(seconds / 60);
}

// 問18
export function shout(text: string): string {
  return `${text.toUpperCase()}!`;
}

// 問19
export function canDrive(age: number, hasLicense: boolean): boolean {
  return age >= 18 && hasLicense;
}

// 問20
export function line(char: string, width: number): string {
  return char.repeat(width);
}
