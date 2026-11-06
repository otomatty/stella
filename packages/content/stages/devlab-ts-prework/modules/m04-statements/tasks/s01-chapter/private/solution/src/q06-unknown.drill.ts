// 問1
export function isText(value: unknown): boolean {
  return typeof value === "string";
}

// 問2
export function lengthOf(value: unknown): number {
  if (typeof value === "string" || Array.isArray(value)) {
    return value.length;
  }
  return 0;
}

// 問3
export function numberOrZero(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

// 問4
export function kindOf(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

// 問5
export function toText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  return "[object]";
}

// 問6
export function addIfNumbers(a: unknown, b: unknown): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a + b;
  }
  return null;
}

// 問7
export function isDateValue(value: unknown): boolean {
  return value instanceof Date;
}

// 問8
export function dateText(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return "日付ではありません";
}

// 問9
export function countStrings(values: readonly unknown[]): number {
  let count = 0;
  for (const value of values) {
    if (typeof value === "string") {
      count++;
    }
  }
  return count;
}

// 問10
export function onlyNumbers(values: readonly unknown[]): number[] {
  const result: number[] = [];
  for (const value of values) {
    if (typeof value === "number") {
      result.push(value);
    }
  }
  return result;
}

// 問11
export function firstText(values: readonly unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string") {
      return value;
    }
  }
  return undefined;
}

// 問12
export function hasName(value: unknown): boolean {
  return (
    typeof value === "object" && value !== null && "name" in value && typeof value.name === "string"
  );
}

// 問13
export function nameOrUnknown(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string"
  ) {
    return value.name;
  }
  return "不明";
}

// 問14
export function isNumberList(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }
  const items: readonly unknown[] = value;
  for (const item of items) {
    if (typeof item !== "number") {
      return false;
    }
  }
  return true;
}

// 問15
export function toBool(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return value === "true";
}

// 問16
export function problemText(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "string") {
    return value;
  }
  return "エラー";
}

// 問17
export function firstItemLength(value: unknown): number {
  if (Array.isArray(value)) {
    const first: unknown = value[0];
    if (typeof first === "string") {
      return first.length;
    }
  }
  return 0;
}

// 問18
export function portOf(config: unknown): number {
  if (
    typeof config === "object" &&
    config !== null &&
    "port" in config &&
    typeof config.port === "number"
  ) {
    return config.port;
  }
  return 3000;
}

// 問19
export function isPlainObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 問20
export function jsonNumber(text: string): number | null {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}
