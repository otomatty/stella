export function describeValue(value: unknown): string {
  if (typeof value === "string") {
    return `文字列(${value.length}文字)`;
  }
  if (typeof value === "number") {
    return `数値(${value})`;
  }
  if (typeof value === "boolean") {
    return `真偽値(${String(value)})`;
  }
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (Array.isArray(value)) {
    return `配列(要素${value.length}個)`;
  }
  if (value instanceof Date) {
    return `日付(${value.toISOString().slice(0, 10)})`;
  }
  if (typeof value === "object") {
    return "オブジェクト";
  }
  return "その他";
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function sumNumbers(values: readonly unknown[]): number {
  let total = 0;
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      total += value;
    }
  }
  return total;
}
