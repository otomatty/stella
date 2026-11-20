export function addDays(date: Date, n: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + n);
  return result;
}

export function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysBetween(a: Date, b: Date): number {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  // 夏時間のある地域では1日が23時間や25時間になるので、四捨五入する
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
