// 問1
export function greetGuest(name = "ゲスト"): string {
  return `こんにちは、${name}さん`;
}

// 問2
export function powerOf(base: number, exponent = 2): number {
  return base ** exponent;
}

// 問3
export function pageCount(total: number, perPage = 10): number {
  return Math.ceil(total / perPage);
}

// 問4
export function priceText(price: number, currency = "円"): string {
  return `${price.toLocaleString("ja-JP")}${currency}`;
}

// 問5
export function stars(char = "*", times = 3): string {
  return char.repeat(times);
}

// 問6
export function bracket(text: string, left = "[", right = "]"): string {
  return `${left}${text}${right}`;
}

// 問7
export function limit(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(value, min), max);
}

// 問8
export function joinItems(items: readonly string[], separator = ", "): string {
  return items.join(separator);
}

// 問9
export function withTax(price: number, rate = 0.1): number {
  return Math.floor(price * (1 + rate));
}

// 問10
export function rangeOf(end: number, start = 0, step = 1): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}

// 問11
export function afterText(seconds = 1): string {
  return `${seconds}秒後`;
}

// 問12
export function makeOptions(size = "M", color = "black"): { size: string; color: string } {
  return { size, color };
}

// 問13
export function padLeft(text: string, width = 5, fill = " "): string {
  return text.padStart(width, fill);
}

// 問14
export function dateText(year: number, month = 1, day = 1): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// 問15
export function shorten(text: string, max = 5): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// 問16
export function passOrFail(score: number, pass = 60): "合格" | "不合格" {
  return score >= pass ? "合格" : "不合格";
}

// 問17
export function percentage(part: number, total = 100): number {
  return Math.round((part / total) * 100);
}

// 問18
export function pageTitle(title: string, site = "Agora"): string {
  return `${title} | ${site}`;
}

// 問19
export function timesTable(n: number, upTo = 9): number[] {
  const result: number[] = [];
  for (let i = 1; i <= upTo; i++) {
    result.push(n * i);
  }
  return result;
}

// 問20
export function splitBy(text: string, separator = ","): string[] {
  return text.split(separator);
}
