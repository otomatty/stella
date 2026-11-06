// 問1
export function isPositive(n: number): boolean {
  return n > 0;
}

// 問2
export function isNegative(n: number): boolean {
  return n < 0;
}

// 問3
export function isOdd(n: number): boolean {
  return n % 2 !== 0;
}

// 問4
export function isTeen(age: number): boolean {
  return age >= 13 && age <= 19;
}

// 問5
export function isWeekend(day: number): boolean {
  return day === 0 || day === 6;
}

// 問6
export function isVowel(char: string): boolean {
  return char.length === 1 && "aeiou".includes(char.toLowerCase());
}

// 問7
export function not(value: boolean): boolean {
  return !value;
}

// 問8
export function both(a: boolean, b: boolean): boolean {
  return a && b;
}

// 問9
export function either(a: boolean, b: boolean): boolean {
  return a || b;
}

// 問10
export function onlyOne(a: boolean, b: boolean): boolean {
  return a !== b;
}

// 問11
export function isEmpty(text: string): boolean {
  return text.length === 0;
}

// 問12
export function isBlank(text: string): boolean {
  return text.trim().length === 0;
}

// 問13
export function hasDigit(text: string): boolean {
  return /\d/.test(text);
}

// 問14
export function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /\d/.test(password) && /[A-Z]/.test(password);
}

// 問15
export function isSameSign(a: number, b: number): boolean {
  return (a > 0 && b > 0) || (a < 0 && b < 0);
}

// 問16
export function canBuy(money: number, price: number, inStock: boolean): boolean {
  return money >= price && inStock;
}

// 問17
export function isMultipleOf3Or5(n: number): boolean {
  return n % 3 === 0 || n % 5 === 0;
}

// 問18
export function isOutOfRange(value: number, min: number, max: number): boolean {
  return value < min || value > max;
}

// 問19
export function isValidName(name: string, max: number): boolean {
  return name.length > 0 && name.length <= max;
}

// 問20
export function isOpen(hour: number, isHoliday: boolean): boolean {
  if (isHoliday) {
    return hour >= 10 && hour < 15;
  }
  return hour >= 9 && hour < 18;
}
