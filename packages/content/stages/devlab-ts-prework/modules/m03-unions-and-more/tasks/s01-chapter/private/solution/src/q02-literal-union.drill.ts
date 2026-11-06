export type Direction = "up" | "down" | "left" | "right";
export type Weekday = "月" | "火" | "水" | "木" | "金";
export type Plan = "free" | "pro" | "enterprise";

// 問1
export function turnRight(direction: Direction): Direction {
  if (direction === "up") {
    return "right";
  }
  if (direction === "right") {
    return "down";
  }
  if (direction === "down") {
    return "left";
  }
  return "up";
}

// 問2
export function parseDirection(text: string): Direction | undefined {
  const value = text.trim().toLowerCase();
  if (value === "up" || value === "down" || value === "left" || value === "right") {
    return value;
  }
  return undefined;
}

// 問3
export function isVertical(direction: Direction): boolean {
  return direction === "up" || direction === "down";
}

// 問4
export function arrowOf(direction: Direction): "↑" | "↓" | "←" | "→" {
  if (direction === "up") {
    return "↑";
  }
  if (direction === "down") {
    return "↓";
  }
  if (direction === "left") {
    return "←";
  }
  return "→";
}

// 問5
export function nextWeekday(day: Weekday): Weekday {
  if (day === "月") {
    return "火";
  }
  if (day === "火") {
    return "水";
  }
  if (day === "水") {
    return "木";
  }
  if (day === "木") {
    return "金";
  }
  return "月";
}

// 問6
export function parseWeekday(text: string): Weekday | undefined {
  const first = text.slice(0, 1);
  if (first === "月" || first === "火" || first === "水" || first === "木" || first === "金") {
    return first;
  }
  return undefined;
}

// 問7
export function isFriday(day: Weekday): boolean {
  return day === "金";
}

// 問8
export function planPrice(plan: Plan): number {
  if (plan === "free") {
    return 0;
  }
  if (plan === "pro") {
    return 1000;
  }
  return 5000;
}

// 問9
export function upgrade(plan: Plan): Plan {
  if (plan === "free") {
    return "pro";
  }
  return "enterprise";
}

// 問10
export function parsePlan(text: string): Plan | undefined {
  const value = text.toLowerCase();
  if (value === "free" || value === "pro" || value === "enterprise") {
    return value;
  }
  return undefined;
}

// 問11
export type Coin = "表" | "裏";

export function flipCoin(coin: Coin): Coin {
  return coin === "表" ? "裏" : "表";
}

// 問12
export type Answer = "yes" | "no" | "maybe";

export function parseAnswer(text: string): Answer | undefined {
  const value = text.toLowerCase();
  if (value === "yes" || value === "no" || value === "maybe") {
    return value;
  }
  return undefined;
}

// 問13
export type Theme = "light" | "dark" | "system";

export function resolveTheme(theme: Theme, osDark: boolean): "light" | "dark" {
  if (theme === "system") {
    return osDark ? "dark" : "light";
  }
  return theme;
}

// 問14
export type Unit = "mm" | "cm" | "m";

export function toMillimeters(value: number, unit: Unit): number {
  if (unit === "m") {
    return value * 1000;
  }
  if (unit === "cm") {
    return value * 10;
  }
  return value;
}

// 問15
export type Grade = "A" | "B" | "C" | "D";

export function gradeFrom(score: number): Grade {
  if (score >= 90) {
    return "A";
  }
  if (score >= 70) {
    return "B";
  }
  if (score >= 50) {
    return "C";
  }
  return "D";
}

// 問16
export type Rank = "gold" | "silver" | "bronze";

export function rankPoint(rank: Rank): number {
  if (rank === "gold") {
    return 3;
  }
  if (rank === "silver") {
    return 2;
  }
  return 1;
}

// 問17
export type TaskStatus = "todo" | "doing" | "done";

export function isFinished(status: TaskStatus): boolean {
  return status === "done";
}

// 問18
export type Signal = "red" | "yellow" | "green";

export function canGo(signal: Signal): boolean {
  return signal === "green";
}

// 問19
export type Lang = "ja" | "en";

export function hello(lang: Lang): "こんにちは" | "Hello" {
  return lang === "ja" ? "こんにちは" : "Hello";
}

// 問20
export type Visibility = "public" | "private";

export function canView(visibility: Visibility, isOwner: boolean): boolean {
  return visibility === "public" || isOwner;
}
