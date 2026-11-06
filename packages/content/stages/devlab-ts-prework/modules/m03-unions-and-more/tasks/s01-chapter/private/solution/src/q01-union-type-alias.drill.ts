// 問1
export function toId(id: string | number): string {
  return String(id);
}

// 問2
export function idLength(id: string | number): number {
  return String(id).length;
}

// 問3
export function formatValue(value: string | number): string {
  if (typeof value === "number") {
    return value.toFixed(2);
  }
  return value;
}

// 問4
export function doubleValue(value: string | number): string | number {
  if (typeof value === "number") {
    return value * 2;
  }
  return value.repeat(2);
}

// 問5
export function isNumberValue(value: string | number): boolean {
  return typeof value === "number";
}

// 問6
export function toNumberValue(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }
  return Number(value);
}

// 問7
export function typeLabel(value: string | number | boolean): "文字列" | "数値" | "真偽値" {
  if (typeof value === "string") {
    return "文字列";
  }
  if (typeof value === "number") {
    return "数値";
  }
  return "真偽値";
}

// 問8
export function sizeOf(value: string | number): number {
  if (typeof value === "string") {
    return value.length;
  }
  return value;
}

// 問9
export function padValue(value: string | number, width: number): string {
  return String(value).padStart(width, "0");
}

// 問10
export type Score = number | "欠席";

export function scoreText(score: Score): string {
  return score === "欠席" ? score : `${score}点`;
}

// 問11
export type Price = number | "非売品";

export function priceText(price: Price): string {
  return price === "非売品" ? price : `${price.toLocaleString("ja-JP")}円`;
}

// 問12
export type Reply = boolean | "未回答";

export function answerText(reply: Reply): string {
  if (reply === "未回答") {
    return reply;
  }
  return reply ? "はい" : "いいえ";
}

// 問13
export type Width = number | "auto";

export function widthCss(width: Width): string {
  return width === "auto" ? width : `${width}px`;
}

// 問14
export type Limit = number | "無制限";

export function isWithinLimit(value: number, limit: Limit): boolean {
  return limit === "無制限" || value <= limit;
}

// 問15
export type Port = number | string;

export function portNumber(port: Port): number {
  return typeof port === "number" ? port : Number.parseInt(port, 10);
}

// 問16
export type Delay = number | "now";

export function delayMs(delay: Delay): number {
  return delay === "now" ? 0 : delay * 1000;
}

// 問17
export type Level = 1 | 2 | 3 | "max";

export function levelValue(level: Level): number {
  return level === "max" ? 10 : level;
}

// 問18
export type UserId = string | number;

export function sameUser(a: UserId, b: UserId): boolean {
  return String(a) === String(b);
}

// 問19
export type FontSize = number | "S" | "M" | "L";

export function fontPx(size: FontSize): number {
  if (size === "S") {
    return 12;
  }
  if (size === "M") {
    return 16;
  }
  if (size === "L") {
    return 20;
  }
  return size;
}

// 問20
export type Temperature = number | "不明";

export function tempText(temp: Temperature): string {
  return temp === "不明" ? temp : `${temp}℃`;
}
