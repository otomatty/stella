export function isLeapYear(year: number): boolean {
  if (year % 400 === 0) {
    return true;
  }
  if (year % 100 === 0) {
    return false;
  }
  return year % 4 === 0;
}

export function hasText(text: string): boolean {
  return text.trim().length > 0;
}

export function canEnter(age: number, hasTicket: boolean, isStaff: boolean): boolean {
  return isStaff || (hasTicket && age >= 12);
}
