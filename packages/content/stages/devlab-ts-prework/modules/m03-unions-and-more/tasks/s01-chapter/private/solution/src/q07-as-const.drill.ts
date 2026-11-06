export const STATUSES = ["todo", "doing", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITY_POINTS = { high: 3, middle: 2, low: 1 } as const;
export type Priority = keyof typeof PRIORITY_POINTS;

export const MONTH_NAMES = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
] as const;

// 問1
export const DAYS = ["月", "火", "水"] as const;

// 問2
export const ORIGIN = { x: 0, y: 0 } as const;

// 問3
export const ROLES = ["admin", "editor", "viewer"] as const;

// 問4
export const HTTP_STATUS = { ok: 200, notFound: 404 } as const;

// 問5
export const LEVELS = [1, 2, 3] as const;

// 問6
export const THEME = { primary: "#0066ff", radius: 4 } as const;

// 問7
export const FLAGS = { beta: true, debug: false } as const;

// 問8
export const ENTRY = ["key", 1] as const;

// 問9
export function isStatus(text: string): boolean {
  return STATUSES.some((status) => status === text);
}

// 問10
export function statusIndex(status: Status): number {
  return STATUSES.indexOf(status);
}

// 問11
export function prevStatus(status: Status): Status {
  return STATUSES[STATUSES.indexOf(status) - 1] ?? status;
}

// 問12
export function priorityPoint(priority: Priority): number {
  return PRIORITY_POINTS[priority];
}

// 問13
export function higherPriority(a: Priority, b: Priority): Priority {
  return PRIORITY_POINTS[b] > PRIORITY_POINTS[a] ? b : a;
}

// 問14
export function monthName(month: number): string {
  const name = MONTH_NAMES[month - 1];
  if (name === undefined) {
    throw new Error("月は1〜12にしてください");
  }
  return name;
}

// 問15
export function allStatuses(): Status[] {
  return [...STATUSES];
}

// 問16
export const STATUS_TEXT = { todo: "未着手", doing: "作業中", done: "完了" } as const;

export function statusText(status: Status) {
  return STATUS_TEXT[status];
}

// 問17
export const SIZE_PX = { S: 12, M: 16, L: 20 } as const;

export function sizePx(size: "S" | "M" | "L"): number {
  return SIZE_PX[size];
}

// 問18
export const WEEKEND = ["土", "日"] as const;

export function isWeekendDay(day: string): boolean {
  return WEEKEND.some((d) => d === day);
}

// 問19
export function countByStatus(statuses: readonly Status[]): {
  todo: number;
  doing: number;
  done: number;
} {
  const counts = { todo: 0, doing: 0, done: 0 };
  for (const status of statuses) {
    counts[status]++;
  }
  return counts;
}

// 問20
export function nextMonthName(month: number): string {
  if (month < 1 || month > 12) {
    throw new Error("月は1〜12にしてください");
  }
  const name = MONTH_NAMES[month % 12];
  if (name === undefined) {
    throw new Error("月は1〜12の整数にしてください");
  }
  return name;
}
