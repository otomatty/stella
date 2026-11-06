// 問1
export function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

// 問2
export function yearOf(date: Date): number {
  return date.getFullYear();
}

// 問3
export function monthOf(date: Date): number {
  return date.getMonth() + 1;
}

// 問4
export function weekdayName(date: Date): string {
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()] ?? "";
}

// 問5
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// 問6
export function addDays(date: Date, n: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + n);
  return result;
}

// 問7
export function addHours(date: Date, h: number): Date {
  const result = new Date(date.getTime());
  result.setHours(result.getHours() + h);
  return result;
}

// 問8
export function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// 問9
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// 問10
export function formatJapanese(date: Date): string {
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()] ?? "";
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekday}）`;
}

// 問11
export function parseDate(text: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match === null) {
    throw new Error(`日付の形が違います: ${text}`);
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// 問12
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 問13
export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

// 問14
export function daysBetween(a: Date, b: Date): number {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

// 問15
export function ageOn(birthday: Date, today: Date): number {
  const age = today.getFullYear() - birthday.getFullYear();
  const hadBirthday =
    today.getMonth() > birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() && today.getDate() >= birthday.getDate());
  return hadBirthday ? age : age - 1;
}

// 問16
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// 問17
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// 問18
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// 問19
export function latest(dates: Date[]): Date | undefined {
  let result: Date | undefined;
  for (const date of dates) {
    if (result === undefined || date.getTime() > result.getTime()) {
      result = date;
    }
  }
  return result;
}

// 問20
export function sortDates(dates: Date[]): Date[] {
  return [...dates].sort((a, b) => a.getTime() - b.getTime());
}
