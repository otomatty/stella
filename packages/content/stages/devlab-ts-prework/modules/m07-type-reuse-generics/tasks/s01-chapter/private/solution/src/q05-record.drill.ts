export type Category = "food" | "drink" | "other";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

// 問1
export type CategoryCount = Record<Category, number>;

// 問2
export type Schedule = Record<Weekday, string[]>;

// 問3
export function emptyCounts(): Record<Category, number> {
  return { food: 0, drink: 0, other: 0 };
}

// 問4
export function countCategories(categories: readonly Category[]): Record<Category, number> {
  const counts: Record<Category, number> = { food: 0, drink: 0, other: 0 };
  for (const category of categories) {
    counts[category]++;
  }
  return counts;
}

// 問5
export const CATEGORY_NAMES: Record<Category, string> = {
  food: "食べ物",
  drink: "飲み物",
  other: "その他",
};

export function categoryName(category: Category): string {
  return CATEGORY_NAMES[category];
}

// 問6
export function emptySchedule(): Record<Weekday, string[]> {
  return { mon: [], tue: [], wed: [], thu: [], fri: [] };
}

// 問7
export function addEvent(
  schedule: Record<Weekday, string[]>,
  day: Weekday,
  event: string,
): Record<Weekday, string[]> {
  return { ...schedule, [day]: [...schedule[day], event] };
}

// 問8
export function busiestDay(schedule: Record<Weekday, string[]>): Weekday {
  const days: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];
  let best: Weekday = "mon";
  for (const day of days) {
    if (schedule[day].length > schedule[best].length) {
      best = day;
    }
  }
  return best;
}

// 問9
export function topScorer(scores: Record<string, number>): string | undefined {
  let top: string | undefined;
  let best = -Infinity;
  for (const [name, score] of Object.entries(scores)) {
    if (score > best) {
      top = name;
      best = score;
    }
  }
  return top;
}

// 問10
export function invertRecord(record: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    result[value] = key;
  }
  return result;
}

// 問11
export function sumRecord(record: Record<string, number>): number {
  let total = 0;
  for (const value of Object.values(record)) {
    total += value;
  }
  return total;
}

// 問12
export function mapRecord(
  record: Record<string, number>,
  fn: (n: number) => number,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = fn(value);
  }
  return result;
}

// 問13
export function filterRecord(record: Record<string, number>, min: number): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value >= min) {
      result[key] = value;
    }
  }
  return result;
}

// 問14
export function fromPairs(pairs: readonly [string, number][]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of pairs) {
    result[key] = value;
  }
  return result;
}

// 問15
export function toPairs(record: Record<string, number>): [string, number][] {
  return Object.entries(record);
}

// 問16
export function priceOf(prices: Record<Category, number>, category: Category): number {
  return prices[category];
}

// 問17
export function orderTotal(
  prices: Record<Category, number>,
  order: Partial<Record<Category, number>>,
): number {
  const categories: Category[] = ["food", "drink", "other"];
  let total = 0;
  for (const category of categories) {
    total += prices[category] * (order[category] ?? 0);
  }
  return total;
}

// 問18
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "月",
  tue: "火",
  wed: "水",
  thu: "木",
  fri: "金",
};

export function weekdayLabel(day: Weekday): string {
  return WEEKDAY_LABELS[day];
}

// 問19
export function groupByInitial(words: readonly string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const word of words) {
    const key = word.slice(0, 1);
    groups[key] = [...(groups[key] ?? []), word];
  }
  return groups;
}

// 問20
export function countLetters(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const char of text) {
    counts[char] = (counts[char] ?? 0) + 1;
  }
  return counts;
}
